import "server-only";

import { ApiError } from "@/lib/api/error-handler";
import * as bpmnQueries from "@/lib/db/queries/bpmn";
import * as e2eQueries from "@/lib/db/queries/e2e-process";
import * as metadataQueries from "@/lib/db/queries/metadata";
import { findProcessById } from "@/lib/db/queries/process";
import { bumpVersion } from "@/lib/utils/process";
import { derivePredecessorsFromBpmn } from "@/lib/utils/bpmn-predecessor-sync";
import {
  isBpmnCallActivityType,
  isBpmnTaskElementType,
} from "@/lib/utils/bpmn-link";
import { diffBpmnXml, EMPTY_BPMN_XML, parseBpmnElementsFromXml } from "@/lib/utils/bpmn-xml";
import { upsertTaskAttribute } from "@/lib/services/metadata.service";
import { createProcess } from "@/lib/services/process.service";
import type {
  BpmnTaskProcessLinkDto,
  BpmnCompareRequest,
  BpmnCompareResult,
  BpmnElementLinkDto,
  BpmnFilters,
  BpmnModelDto,
  BpmnModelKind,
  CreateBpmnDto,
  LinkOrCreateBpmnTaskDto,
  UpdateBpmnDto,
} from "@/types/bpmn";

type ModelMeta = {
  processCode?: string;
  processName?: string;
  e2eProcessCode?: string;
  e2eProcessName?: string;
};

/** 모델 + 요소 DTO 변환 */
const toBpmnModelDto = async (
  model: NonNullable<Awaited<ReturnType<typeof bpmnQueries.findBpmnModelById>>>,
  meta?: ModelMeta,
): Promise<BpmnModelDto> => {
  const elements = await bpmnQueries.listBpmnElements(model.modelId);

  return {
    ...model,
    processCode: meta?.processCode,
    processName: meta?.processName,
    e2eProcessCode: meta?.e2eProcessCode,
    e2eProcessName: meta?.e2eProcessName,
    elements: elements.map((el) => ({
      ...el,
      linkedProcessCode: el.linkedProcessCode,
      linkedProcessName: el.linkedProcessName,
    })),
  };
};

const resolveModelMeta = async (
  model: NonNullable<Awaited<ReturnType<typeof bpmnQueries.findBpmnModelById>>>,
): Promise<ModelMeta> => {
  if (model.modelKind === "E2E" && model.e2eProcessId) {
    const e2e = await e2eQueries.findE2eProcessById(model.e2eProcessId);
    return e2e
      ? { e2eProcessCode: e2e.code, e2eProcessName: e2e.name }
      : {};
  }

  if (model.nodeId) {
    const process = await findProcessById(model.nodeId);
    return process
      ? { processCode: process.code, processName: process.name }
      : {};
  }

  return {};
};

/** BPMN 모델 목록 */
export const listBpmnModels = async (
  filters: BpmnFilters = {},
): Promise<BpmnModelDto[]> => {
  const rows = await bpmnQueries.listBpmnModels(filters);
  return rows.map((row) => ({
    ...row,
    processCode: row.processCode ?? undefined,
    processName: row.processName ?? undefined,
    e2eProcessCode: row.e2eProcessCode ?? undefined,
    e2eProcessName: row.e2eProcessName ?? undefined,
  }));
};

/** BPMN 모델 상세 */
export const getBpmnModelDetail = async (
  modelId: number,
): Promise<BpmnModelDto> => {
  const model = await bpmnQueries.findBpmnModelById(modelId);
  if (!model) {
    throw new ApiError("E303", "BPMN model not found", 404);
  }

  const meta = await resolveModelMeta(model);
  return toBpmnModelDto(model, meta);
};

/** 노드별 버전 이력 */
export const getBpmnModelHistory = async (
  nodeId: number,
): Promise<BpmnModelDto[]> => {
  const versions = await bpmnQueries.listBpmnVersionsByNode(nodeId);
  const process = await findProcessById(nodeId);

  return Promise.all(
    versions.map((v) =>
      toBpmnModelDto(
        v,
        process
          ? { processCode: process.code, processName: process.name }
          : undefined,
      ),
    ),
  );
};

/** BPMN 모델 생성 */
export const createBpmnModel = async (
  dto: CreateBpmnDto,
  userId?: number,
): Promise<BpmnModelDto> => {
  if (!dto.modelName?.trim()) {
    throw new ApiError("E001", "Model name is required", 400, undefined, "modelName");
  }

  const modelKind: BpmnModelKind =
    dto.modelKind ?? (dto.e2eProcessId ? "E2E" : "L3_PROCESS");

  if (modelKind === "E2E") {
    if (!dto.e2eProcessId) {
      throw new ApiError(
        "E001",
        "e2eProcessId is required for E2E BPMN",
        400,
        undefined,
        "e2eProcessId",
      );
    }

    const e2e = await e2eQueries.findE2eProcessById(dto.e2eProcessId);
    if (!e2e) {
      throw new ApiError("E404", "E2E process not found", 404);
    }

    await bpmnQueries.clearCurrentFlagForE2eProcess(dto.e2eProcessId);

    const initialElements = mergeElements(dto.bpmnXml ?? EMPTY_BPMN_XML, undefined);
    if (initialElements.length > 0) {
      await validateE2eBpmnElements(initialElements);
    }

    const modelId = await bpmnQueries.insertBpmnModel({
      e2eProcessId: dto.e2eProcessId,
      modelKind: "E2E",
      modelName: dto.modelName.trim(),
      bpmnXml: dto.bpmnXml ?? EMPTY_BPMN_XML,
      isCurrent: true,
      createdBy: userId ?? null,
    });

    const model = await bpmnQueries.findBpmnModelById(modelId);
    if (!model) {
      throw new ApiError("E501", "Failed to create BPMN model", 500);
    }

    return toBpmnModelDto(model, {
      e2eProcessCode: e2e.code,
      e2eProcessName: e2e.name,
    });
  }

  if (!dto.nodeId) {
    throw new ApiError(
      "E001",
      "nodeId is required for L3 BPMN",
      400,
      undefined,
      "nodeId",
    );
  }

  const process = await findProcessById(dto.nodeId);
  if (!process) {
    throw new ApiError("E302", "Process not found", 404);
  }

  await bpmnQueries.clearCurrentFlagForNode(dto.nodeId);

  const modelId = await bpmnQueries.insertBpmnModel({
    nodeId: dto.nodeId,
    modelKind: "L3_PROCESS",
    modelName: dto.modelName.trim(),
    bpmnXml: dto.bpmnXml ?? EMPTY_BPMN_XML,
    isCurrent: true,
    createdBy: userId ?? null,
  });

  const model = await bpmnQueries.findBpmnModelById(modelId);
  if (!model) {
    throw new ApiError("E501", "Failed to create BPMN model", 500);
  }

  return toBpmnModelDto(model, {
    processCode: process.code,
    processName: process.name,
  });
};

/** 요소 목록 병합 (클라이언트 링크 + XML 파싱) */
const mergeElements = (
  bpmnXml: string | null | undefined,
  elements?: BpmnElementLinkDto[],
): BpmnElementLinkDto[] => {
  const parsed = parseBpmnElementsFromXml(bpmnXml ?? null);
  const linkMap = new Map(
    (elements ?? []).map((el) => [el.elementBpmnId, el]),
  );

  const merged = parsed.map((el) => {
    const linked = linkMap.get(el.elementBpmnId);
    return {
      elementBpmnId: el.elementBpmnId,
      elementType: el.elementType,
      elementName: linked?.elementName ?? el.elementName,
      linkedNodeId: linked?.linkedNodeId ?? null,
      properties: linked?.properties ?? null,
    };
  });

  const mergedIds = new Set(merged.map((el) => el.elementBpmnId));
  for (const el of elements ?? []) {
    if (!mergedIds.has(el.elementBpmnId)) {
      merged.push({
        elementBpmnId: el.elementBpmnId,
        elementType: el.elementType,
        elementName: el.elementName ?? null,
        linkedNodeId: el.linkedNodeId ?? null,
        properties: el.properties ?? null,
      });
    }
  }

  return merged;
};

/** E2E BPMN 요소 검증 — L3_CALL만 허용, cross-L1 L3 허용, L4 Task 금지 */
const validateE2eBpmnElements = async (
  elements: BpmnElementLinkDto[],
): Promise<void> => {
  for (const element of elements) {
    if (isBpmnTaskElementType(element.elementType)) {
      throw new ApiError(
        "E405",
        "E2E BPMN does not allow L4 Task elements",
        400,
        undefined,
        "elementType",
      );
    }

    if (!element.linkedNodeId) {
      continue;
    }

    if (!isBpmnCallActivityType(element.elementType)) {
      throw new ApiError(
        "E405",
        "E2E BPMN only allows Call Activity links to L3",
        400,
        undefined,
        "linkedNodeId",
      );
    }

    if (element.properties?.linkKind === "L4_TASK") {
      throw new ApiError(
        "E405",
        "E2E BPMN only allows L3_CALL links",
        400,
        undefined,
        "linkedNodeId",
      );
    }

    const linked = await findProcessById(element.linkedNodeId);
    if (!linked) {
      throw new ApiError("E302", "Linked process not found", 404);
    }

    if (linked.level !== "L3") {
      throw new ApiError(
        "E405",
        "Call Activity can only link to an L3 process",
        400,
        undefined,
        "linkedNodeId",
      );
    }

    // cross-L1 L3 연결 허용 — L1/부모 노드 제약 없음
  }
};

/** BPMN 요소 연결 대상(L3 Call / L4 Task) 유효성을 검사한다 */
const validateBpmnElementLinks = async (
  modelKind: BpmnModelKind,
  ownerNodeId: number | null,
  elements: BpmnElementLinkDto[],
): Promise<void> => {
  if (modelKind === "E2E") {
    await validateE2eBpmnElements(elements);
    return;
  }

  for (const element of elements) {
    if (!element.linkedNodeId) {
      continue;
    }

    const linked = await findProcessById(element.linkedNodeId);
    if (!linked) {
      throw new ApiError("E302", "Linked process not found", 404);
    }

    if (isBpmnCallActivityType(element.elementType)) {
      if (linked.level !== "L3") {
        throw new ApiError(
          "E405",
          "Call Activity can only link to an L3 process",
          400,
          undefined,
          "linkedNodeId",
        );
      }
      if (linked.nodeId === ownerNodeId) {
        throw new ApiError(
          "E404",
          "Call Activity cannot reference the same L3 process",
          400,
          undefined,
          "linkedNodeId",
        );
      }
      continue;
    }

    if (isBpmnTaskElementType(element.elementType) && linked.level !== "L4") {
      throw new ApiError(
        "E405",
        "BPMN Task can only link to an L4 process",
        400,
        undefined,
        "linkedNodeId",
      );
    }
  }
};

/** BPMN sequence flow에서 task_predecessor를 병합 동기화한다 */
const syncPredecessorsFromBpmnModel = async (
  bpmnXml: string | null,
  elements: BpmnElementLinkDto[],
): Promise<void> => {
  const pairs = derivePredecessorsFromBpmn(bpmnXml, elements);
  await metadataQueries.mergeTaskPredecessorsFromBpmn(pairs);
};

/** BPMN 모델 수정 */
export const updateBpmnModel = async (
  modelId: number,
  dto: UpdateBpmnDto,
  userId?: number,
): Promise<BpmnModelDto> => {
  const existing = await bpmnQueries.findBpmnModelById(modelId);
  if (!existing) {
    throw new ApiError("E303", "BPMN model not found", 404);
  }

  if (dto.createNewVersion) {
    const merged = mergeElements(dto.bpmnXml ?? existing.bpmnXml, dto.elements);
    if (merged.length > 0) {
      await validateBpmnElementLinks(
        existing.modelKind,
        existing.nodeId,
        merged,
      );
    }

    const newModelId = await bpmnQueries.insertBpmnModelVersion(existing.modelId, {
      nodeId: existing.nodeId,
      e2eProcessId: existing.e2eProcessId,
      modelKind: existing.modelKind,
      modelName: dto.modelName?.trim() ?? existing.modelName,
      version: bumpVersion(existing.version, "minor"),
      bpmnXml: dto.bpmnXml ?? existing.bpmnXml ?? null,
      svgContent: dto.svgContent ?? existing.svgContent ?? null,
      status: dto.status ?? existing.status,
      createdBy: userId ?? null,
      elements: merged,
    });

    if (existing.modelKind !== "E2E") {
      await syncPredecessorsFromBpmnModel(
        dto.bpmnXml ?? existing.bpmnXml ?? null,
        merged,
      );
    }

    const created = await bpmnQueries.findBpmnModelById(newModelId);
    if (!created) {
      throw new ApiError("E501", "Failed to create new version", 500);
    }

    const meta = await resolveModelMeta(created);
    return toBpmnModelDto(created, meta);
  }

  await bpmnQueries.updateBpmnModel(modelId, {
    modelName: dto.modelName?.trim(),
    bpmnXml: dto.bpmnXml,
    svgContent: dto.svgContent,
    status: dto.status,
    updatedBy: userId ?? null,
  });

  const merged = mergeElements(dto.bpmnXml ?? existing.bpmnXml, dto.elements);
  if (dto.elements !== undefined || dto.bpmnXml !== undefined) {
    if (merged.length > 0) {
      await validateBpmnElementLinks(
        existing.modelKind,
        existing.nodeId,
        merged,
      );
    }
    await bpmnQueries.syncBpmnElements(modelId, merged);
    if (existing.modelKind !== "E2E") {
      await syncPredecessorsFromBpmnModel(
        dto.bpmnXml ?? existing.bpmnXml ?? null,
        merged,
      );
    }
  }

  return getBpmnModelDetail(modelId);
};

/** BPMN Task를 L4 프로세스로 자동 생성하거나 기존 연결을 반환한다. */
export const linkOrCreateBpmnTaskProcess = async (
  modelId: number,
  dto: LinkOrCreateBpmnTaskDto,
  userId?: number,
): Promise<BpmnTaskProcessLinkDto> => {
  const model = await bpmnQueries.findBpmnModelById(modelId);
  if (!model) {
    throw new ApiError("E303", "BPMN model not found", 404);
  }

  if (model.modelKind === "E2E") {
    throw new ApiError(
      "E405",
      "E2E BPMN does not support L4 task auto-create",
      400,
    );
  }

  if (!model.nodeId) {
    throw new ApiError("E302", "Process not found", 404);
  }

  const modelProcess = await findProcessById(model.nodeId);
  if (!modelProcess) {
    throw new ApiError("E302", "Process not found", 404);
  }

  if (modelProcess.level !== "L3") {
    throw new ApiError(
      "E405",
      "BPMN task metadata can be created only under an L3 process",
      400,
      undefined,
      "nodeId",
    );
  }

  const existingElement = (await bpmnQueries.listBpmnElements(modelId)).find(
    (element) => element.elementBpmnId === dto.elementBpmnId,
  );

  if (existingElement?.linkedNodeId) {
    const linked = await findProcessById(existingElement.linkedNodeId);
    if (linked) {
      return {
        elementBpmnId: dto.elementBpmnId,
        nodeId: linked.nodeId,
        code: linked.code,
        name: linked.name,
      };
    }
  }

  const taskName = dto.elementName?.trim() || "신규 Task";
  const process = await createProcess(
    {
      parentNodeId: model.nodeId,
      autoCode: true,
      name: taskName,
      description: null,
      status: "DRAFT",
      version: "1.0.0",
      i18n: {
        ko: {
          name: taskName,
          description: null,
        },
      },
    },
    "ko",
    userId,
  );

  await bpmnQueries.upsertBpmnElementLink(modelId, {
    elementBpmnId: dto.elementBpmnId,
    elementType: dto.elementType,
    elementName: taskName,
    linkedNodeId: process.nodeId,
  });

  await upsertTaskAttribute(
    {
      nodeId: process.nodeId,
      definition: taskName,
      version: "1.0.0",
      i18n: {
        ko: {
          definition: taskName,
        },
      },
    },
    "ko",
    userId,
  );

  return {
    elementBpmnId: dto.elementBpmnId,
    nodeId: process.nodeId,
    code: process.code,
    name: process.name,
  };
};

/** BPMN 모델 복제 */
export const duplicateBpmnModel = async (
  modelId: number,
  modelName: string,
  userId?: number,
): Promise<BpmnModelDto> => {
  const existing = await getBpmnModelDetail(modelId);

  if (!modelName?.trim()) {
    throw new ApiError("E001", "Model name is required", 400, undefined, "modelName");
  }

  const newModelId = await bpmnQueries.insertBpmnModel({
    nodeId: existing.nodeId,
    e2eProcessId: existing.e2eProcessId,
    modelKind: existing.modelKind,
    modelName: modelName.trim(),
    bpmnXml: existing.bpmnXml,
    svgContent: existing.svgContent,
    status: "DRAFT",
    isCurrent: false,
    createdBy: userId ?? null,
  });

  if (existing.elements?.length) {
    await bpmnQueries.syncBpmnElements(
      newModelId,
      existing.elements.map((el) => ({
        elementBpmnId: el.elementBpmnId,
        elementType: el.elementType,
        elementName: el.elementName,
        linkedNodeId: el.linkedNodeId,
        properties: el.properties,
      })),
    );
  }

  return getBpmnModelDetail(newModelId);
};

/** BPMN 모델 삭제 */
export const deleteBpmnModel = async (modelId: number): Promise<void> => {
  const existing = await bpmnQueries.findBpmnModelById(modelId);
  if (!existing) {
    throw new ApiError("E303", "BPMN model not found", 404);
  }

  await bpmnQueries.deleteBpmnModel(modelId);
};

/** 두 BPMN 모델 버전 비교 */
export const compareBpmnModels = async (
  request: BpmnCompareRequest,
): Promise<BpmnCompareResult> => {
  const left = await getBpmnModelDetail(request.leftModelId);
  const right = await getBpmnModelDetail(request.rightModelId);

  const diff = diffBpmnXml(left.bpmnXml, right.bpmnXml);

  return { left, right, diff };
};

/** E2E BPMN이 없으면 자동 생성하고 modelId 반환 */
export const ensureE2eBpmnModel = async (
  e2eProcessId: number,
  userId?: number,
): Promise<number> => {
  const existing =
    await bpmnQueries.findCurrentBpmnModelByE2eProcessId(e2eProcessId);
  if (existing) {
    return existing.modelId;
  }

  const e2e = await e2eQueries.findE2eProcessById(e2eProcessId);
  if (!e2e) {
    throw new ApiError("E404", "E2E process not found", 404);
  }

  const created = await createBpmnModel(
    {
      e2eProcessId,
      modelKind: "E2E",
      modelName: `${e2e.name} E2E`,
    },
    userId,
  );

  return created.modelId;
};
