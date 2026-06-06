import "server-only";

import { ApiError } from "@/lib/api/error-handler";
import * as bpmnQueries from "@/lib/db/queries/bpmn";
import { findProcessById } from "@/lib/db/queries/process";
import { bumpVersion } from "@/lib/utils/process";
import { diffBpmnXml, EMPTY_BPMN_XML, parseBpmnElementsFromXml } from "@/lib/utils/bpmn-xml";
import type {
  BpmnCompareRequest,
  BpmnCompareResult,
  BpmnElementLinkDto,
  BpmnFilters,
  BpmnModelDto,
  CreateBpmnDto,
  UpdateBpmnDto,
} from "@/types/bpmn";

/** 모델 + 요소 DTO 변환 */
const toBpmnModelDto = async (
  model: NonNullable<Awaited<ReturnType<typeof bpmnQueries.findBpmnModelById>>>,
  processMeta?: { processCode: string; processName: string },
): Promise<BpmnModelDto> => {
  const elements = await bpmnQueries.listBpmnElements(model.modelId);

  return {
    ...model,
    processCode: processMeta?.processCode,
    processName: processMeta?.processName,
    elements: elements.map((el) => ({
      ...el,
      linkedProcessCode: el.linkedProcessCode,
      linkedProcessName: el.linkedProcessName,
    })),
  };
};

/** BPMN 모델 목록 */
export const listBpmnModels = async (
  filters: BpmnFilters = {},
): Promise<BpmnModelDto[]> => {
  const rows = await bpmnQueries.listBpmnModels(filters);
  return rows.map((row) => ({
    ...row,
    processCode: row.processCode,
    processName: row.processName,
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

  const process = await findProcessById(model.nodeId);
  return toBpmnModelDto(
    model,
    process
      ? { processCode: process.code, processName: process.name }
      : undefined,
  );
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

  const process = await findProcessById(dto.nodeId);
  if (!process) {
    throw new ApiError("E302", "Process not found", 404);
  }

  await bpmnQueries.clearCurrentFlagForNode(dto.nodeId);

  const modelId = await bpmnQueries.insertBpmnModel({
    nodeId: dto.nodeId,
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

  return parsed.map((el) => {
    const linked = linkMap.get(el.elementBpmnId);
    return {
      elementBpmnId: el.elementBpmnId,
      elementType: el.elementType,
      elementName: linked?.elementName ?? el.elementName,
      linkedNodeId: linked?.linkedNodeId ?? null,
      properties: linked?.properties ?? null,
    };
  });
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
    await bpmnQueries.clearCurrentFlagForNode(existing.nodeId);

    const newModelId = await bpmnQueries.insertBpmnModel({
      nodeId: existing.nodeId,
      modelName: dto.modelName?.trim() ?? existing.modelName,
      version: bumpVersion(existing.version, "minor"),
      bpmnXml: dto.bpmnXml ?? existing.bpmnXml,
      svgContent: dto.svgContent ?? existing.svgContent,
      status: dto.status ?? existing.status,
      isCurrent: true,
      createdBy: userId ?? null,
    });

    const merged = mergeElements(dto.bpmnXml ?? existing.bpmnXml, dto.elements);
    if (merged.length > 0) {
      await bpmnQueries.syncBpmnElements(newModelId, merged);
    }

    await bpmnQueries.updateBpmnModel(existing.modelId, { isCurrent: false });

    const created = await bpmnQueries.findBpmnModelById(newModelId);
    if (!created) {
      throw new ApiError("E501", "Failed to create new version", 500);
    }

    const process = await findProcessById(created.nodeId);
    return toBpmnModelDto(
      created,
      process
        ? { processCode: process.code, processName: process.name }
        : undefined,
    );
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
    await bpmnQueries.syncBpmnElements(modelId, merged);
  }

  return getBpmnModelDetail(modelId);
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
