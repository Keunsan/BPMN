import "server-only";

import * as bpmnQueries from "@/lib/db/queries/bpmn";
import * as metadataQueries from "@/lib/db/queries/metadata";
import * as processQueries from "@/lib/db/queries/process";
import {
  isBpmnCallActivityType,
  isBpmnTaskElementType,
} from "@/lib/utils/bpmn-link";
import type { BpmnElementLinkDto } from "@/types/bpmn";
import type { ProcessNode } from "@/types/process";

export type VariantScope = {
  companyCode: string;
  businessUnitCode: string;
};

/** scope에 맞게 BPMN element linked_node_id를 해석한다 */
export const resolveLinkedNodeIdForScope = async (
  linkedNodeId: number,
  scope: VariantScope,
): Promise<number> => {
  const linked = await processQueries.findProcessById(linkedNodeId);
  if (!linked) {
    return linkedNodeId;
  }

  if (
    linked.companyCode === scope.companyCode &&
    linked.businessUnitCode === scope.businessUnitCode
  ) {
    return linkedNodeId;
  }

  const baseNodeId = linked.variantOf ?? linked.nodeId;
  const variant = await processQueries.findVariantByScope(
    baseNodeId,
    scope.companyCode,
    scope.businessUnitCode,
  );

  return variant?.nodeId ?? linkedNodeId;
};

/** 표준 L4에서 단일 변형 노드를 생성한다 */
const createL4VariantNode = async (
  standardL4: ProcessNode,
  variantL3Id: number,
  scope: VariantScope,
  userId?: number,
): Promise<ProcessNode> => {
  const code = processQueries.generateVariantCode(
    standardL4.code,
    scope.companyCode,
    scope.businessUnitCode,
  );

  const standardI18n = await processQueries.findProcessI18n(standardL4.nodeId);
  const node = await processQueries.createProcess({
    parentNodeId: variantL3Id,
    level: "L4",
    code,
    name: standardL4.name,
    description: standardL4.description,
    status: "DRAFT",
    ownerOrgId: standardL4.ownerOrgId,
    version: "1.0.0",
    validFrom: standardL4.validFrom
      ? standardL4.validFrom.toISOString().slice(0, 10)
      : null,
    validTo: standardL4.validTo
      ? standardL4.validTo.toISOString().slice(0, 10)
      : null,
    isStandard: false,
    variantOf: standardL4.nodeId,
    companyCode: scope.companyCode,
    businessUnitCode: scope.businessUnitCode,
    sortOrder: standardL4.sortOrder,
    createdBy: userId ?? null,
  });

  await processQueries.upsertProcessI18n(node.nodeId, standardI18n);
  return node;
};

/** 표준 L3의 L4 자식 변형을 일괄 생성하고 표준→변형 매핑을 반환한다 */
export const ensureL4VariantsForL3 = async (
  standardL3Id: number,
  variantL3Id: number,
  scope: VariantScope,
  userId?: number,
): Promise<Map<number, number>> => {
  const mapping = new Map<number, number>();
  const children = await processQueries.listChildProcesses(standardL3Id);

  for (const child of children) {
    if (child.level !== "L4" || child.variantOf != null) {
      continue;
    }

    const existing = await processQueries.findVariantByScope(
      child.nodeId,
      scope.companyCode,
      scope.businessUnitCode,
    );

    if (existing) {
      mapping.set(child.nodeId, existing.nodeId);
      continue;
    }

    const variantL4 = await createL4VariantNode(
      child,
      variantL3Id,
      scope,
      userId,
    );
    mapping.set(child.nodeId, variantL4.nodeId);
  }

  return mapping;
};

/** 표준 BPMN을 변형 L3로 복제하고 링크를 재매핑한다 */
export const copyBpmnForVariant = async (
  standardNodeId: number,
  variantNodeId: number,
  scope: VariantScope,
  userId?: number,
  l4Mapping?: Map<number, number>,
): Promise<number | null> => {
  const standardModel =
    await bpmnQueries.findCurrentBpmnModelByNodeId(standardNodeId);
  if (!standardModel?.bpmnXml) {
    return null;
  }

  const standardElements = await bpmnQueries.listBpmnElements(
    standardModel.modelId,
  );

  const remappedElements: BpmnElementLinkDto[] = [];

  for (const element of standardElements) {
    let linkedNodeId = element.linkedNodeId;

    if (linkedNodeId) {
      const linked = await processQueries.findProcessById(linkedNodeId);
      if (linked) {
        if (isBpmnTaskElementType(element.elementType) && linked.level === "L4") {
          linkedNodeId =
            l4Mapping?.get(linked.nodeId) ??
            (await resolveLinkedNodeIdForScope(linked.nodeId, scope));
        } else if (
          isBpmnCallActivityType(element.elementType) &&
          linked.level === "L3"
        ) {
          linkedNodeId = await resolveLinkedNodeIdForScope(
            linked.nodeId,
            scope,
          );
        }
      }
    }

    remappedElements.push({
      elementBpmnId: element.elementBpmnId,
      elementType: element.elementType,
      elementName: element.elementName,
      linkedNodeId,
      properties: element.properties,
    });
  }

  await bpmnQueries.clearCurrentFlagForNode(variantNodeId);

  const variantProcess = await processQueries.findProcessById(variantNodeId);
  const modelName = variantProcess
    ? `${variantProcess.name} BPMN`
    : standardModel.modelName;

  const newModelId = await bpmnQueries.insertBpmnModel({
    nodeId: variantNodeId,
    modelName,
    version: "1.0.0",
    bpmnXml: standardModel.bpmnXml,
    svgContent: standardModel.svgContent,
    status: "DRAFT",
    isCurrent: true,
    createdBy: userId ?? null,
  });

  if (remappedElements.length > 0) {
    await bpmnQueries.syncBpmnElements(newModelId, remappedElements);
  }

  return newModelId;
};

/** 단일 노드의 Task 메타데이터를 복제한다 */
export const copyMetadataForVariantNode = async (
  standardNodeId: number,
  variantNodeId: number,
  userId?: number,
): Promise<void> => {
  const sourceAttr = await metadataQueries.findTaskAttributeByNodeId(
    standardNodeId,
  );
  if (!sourceAttr) {
    return;
  }

  const sourceI18n = await metadataQueries.findTaskAttributeI18n(
    sourceAttr.attrId,
  );

  const copied = await metadataQueries.upsertTaskAttribute({
    nodeId: variantNodeId,
    definition: sourceAttr.definition,
    purpose: sourceAttr.purpose,
    inputDeliverable: sourceAttr.inputDeliverable,
    inputDataDesc: sourceAttr.inputDataDesc,
    inputCondition: sourceAttr.inputCondition,
    outputDeliverable: sourceAttr.outputDeliverable,
    outputDataDesc: sourceAttr.outputDataDesc,
    outputCondition: sourceAttr.outputCondition,
    frequency: sourceAttr.frequency,
    triggerEvent: sourceAttr.triggerEvent,
    duration: sourceAttr.duration,
    issues: sourceAttr.issues,
    exceptions: sourceAttr.exceptions,
    remarks: sourceAttr.remarks,
    version: sourceAttr.version,
    createdBy: userId ?? null,
    updatedBy: userId ?? null,
  });

  if (Object.keys(sourceI18n).length > 0) {
    await metadataQueries.upsertTaskAttributeI18n(copied.attrId, sourceI18n);
  }
};

/** L3 변형에 연결된 L4 변형들의 메타데이터를 일괄 복제한다 */
export const copyMetadataForL3Variant = async (
  l4Mapping: Map<number, number>,
  userId?: number,
): Promise<void> => {
  for (const [standardL4Id, variantL4Id] of l4Mapping) {
    await copyMetadataForVariantNode(standardL4Id, variantL4Id, userId);
  }
};

/** L4 변형 생성 시 부모 L3 변형 BPMN의 Task 링크를 갱신한다 */
export const updateL4VariantBpmnLink = async (
  standardL4Id: number,
  variantL4Id: number,
  scope: VariantScope,
): Promise<void> => {
  const standardL4 = await processQueries.findProcessById(standardL4Id);
  if (!standardL4?.parentNodeId) {
    return;
  }

  const parentVariant = await processQueries.findVariantByScope(
    standardL4.parentNodeId,
    scope.companyCode,
    scope.businessUnitCode,
  );
  if (!parentVariant) {
    return;
  }

  const variantModel = await bpmnQueries.findCurrentBpmnModelByNodeId(
    parentVariant.nodeId,
  );
  if (!variantModel) {
    return;
  }

  const elements = await bpmnQueries.listBpmnElements(variantModel.modelId);
  const targetElement = elements.find(
    (element) =>
      element.linkedNodeId === standardL4Id &&
      isBpmnTaskElementType(element.elementType),
  );

  if (!targetElement) {
    return;
  }

  await bpmnQueries.upsertBpmnElementLink(variantModel.modelId, {
    elementBpmnId: targetElement.elementBpmnId,
    elementType: targetElement.elementType,
    elementName: targetElement.elementName,
    linkedNodeId: variantL4Id,
    properties: targetElement.properties,
  });
};
