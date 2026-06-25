import "server-only";

import * as bpmnQueries from "@/lib/db/queries/bpmn";
import * as metadataQueries from "@/lib/db/queries/metadata";
import * as processQueries from "@/lib/db/queries/process";
import {
  collectLinkedNodeIds,
  derivePredecessorsFromBpmn,
  normalizeBpmnLinkedNodeId,
} from "@/lib/utils/bpmn-predecessor-sync";
import type { BpmnElementLinkDto } from "@/types/bpmn";

/** BPMN 요소 목록을 선행 동기화용 DTO로 변환한다 */
const toElementLinks = (
  elements: Awaited<ReturnType<typeof bpmnQueries.listBpmnElements>>,
): BpmnElementLinkDto[] =>
  elements.map((element) => ({
    elementBpmnId: element.elementBpmnId,
    elementType: element.elementType,
    elementName: element.elementName,
    linkedNodeId: normalizeBpmnLinkedNodeId(element.linkedNodeId),
    properties: element.properties,
  }));

/** L3 하위 직계 L4 nodeId를 조회한다 — BPMN 연결 해제된 L4도 선행 관계 초기화 범위에 포함 */
const resolveL4ScopeNodeIds = async (
  l3NodeId: number | null | undefined,
): Promise<number[]> => {
  if (l3NodeId == null || !Number.isFinite(l3NodeId)) {
    return [];
  }

  const l4ByParent = await processQueries.listL4NodeIdsByParentNodeIds([l3NodeId]);
  return l4ByParent.get(l3NodeId) ?? [];
};

/** BPMN XML·요소 목록에서 task_predecessor를 동기화한다 */
export const syncBpmnTaskPredecessorsFromElements = async (
  bpmnXml: string | null,
  elements: BpmnElementLinkDto[],
  previousElements: BpmnElementLinkDto[] = elements,
  l3NodeId?: number | null,
): Promise<void> => {
  const pairs = derivePredecessorsFromBpmn(bpmnXml, elements);
  const linkedScopeNodeIds = [
    ...new Set([
      ...collectLinkedNodeIds(elements),
      ...collectLinkedNodeIds(previousElements),
    ]),
  ];
  const l4ScopeNodeIds = await resolveL4ScopeNodeIds(l3NodeId);
  const scopeNodeIds = [...new Set([...linkedScopeNodeIds, ...l4ScopeNodeIds])];

  await metadataQueries.syncTaskPredecessorsFromBpmn(pairs, scopeNodeIds);
};

/** L3 프로세스의 현재 BPMN 모델에서 task_predecessor를 동기화한다 */
export const syncBpmnTaskPredecessorsForL3 = async (
  l3NodeId: number,
): Promise<void> => {
  const model = await bpmnQueries.findCurrentBpmnModelByNodeId(l3NodeId);
  if (!model || model.modelKind === "E2E") {
    return;
  }

  const elements = await bpmnQueries.listBpmnElements(model.modelId);
  const elementLinks = toElementLinks(elements);
  await syncBpmnTaskPredecessorsFromElements(
    model.bpmnXml,
    elementLinks,
    elementLinks,
    l3NodeId,
  );
};

/** 여러 L3 프로세스의 BPMN 선행 관계를 일괄 동기화한다 */
export const syncBpmnTaskPredecessorsForL3Nodes = async (
  l3NodeIds: number[],
): Promise<void> => {
  const uniqueIds = [...new Set(l3NodeIds.filter((id) => Number.isFinite(id)))];
  await Promise.all(uniqueIds.map((l3NodeId) => syncBpmnTaskPredecessorsForL3(l3NodeId)));
};
