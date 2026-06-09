import "server-only";

import { ApiError } from "@/lib/api/error-handler";
import type { Locale } from "@/lib/i18n/config";
import type {
  TaskAttributeDto,
  TaskAttributeI18nMap,
  TaskAttributeListFilters,
  TaskAttributeListItem,
  UpsertTaskAttributeDto,
  UpsertTaskPredecessorDto,
} from "@/types/metadata";

import * as metadataQueries from "@/lib/db/queries/metadata";
import * as processQueries from "@/lib/db/queries/process";

/** 요청 DTO에서 한국어 기본 컬럼을 구성한다. */
const withKoFallback = (dto: UpsertTaskAttributeDto): UpsertTaskAttributeDto => {
  const ko = dto.i18n?.ko;

  return {
    ...dto,
    definition: ko?.definition ?? dto.definition ?? null,
    purpose: ko?.purpose ?? dto.purpose ?? null,
    inputDeliverable: ko?.inputDeliverable ?? dto.inputDeliverable ?? null,
    inputDataDesc: ko?.inputDataDesc ?? dto.inputDataDesc ?? null,
    inputCondition: ko?.inputCondition ?? dto.inputCondition ?? null,
    outputDeliverable: ko?.outputDeliverable ?? dto.outputDeliverable ?? null,
    outputDataDesc: ko?.outputDataDesc ?? dto.outputDataDesc ?? null,
    outputCondition: ko?.outputCondition ?? dto.outputCondition ?? null,
    issues: ko?.issues ?? dto.issues ?? null,
    exceptions: ko?.exceptions ?? dto.exceptions ?? null,
    remarks: ko?.remarks ?? dto.remarks ?? null,
  };
};

/** 기본 컬럼을 포함하는 i18n 맵을 구성한다. */
const buildI18nMap = (dto: UpsertTaskAttributeDto): TaskAttributeI18nMap => ({
  ko: {
    definition: dto.definition ?? null,
    purpose: dto.purpose ?? null,
    inputDeliverable: dto.inputDeliverable ?? null,
    inputDataDesc: dto.inputDataDesc ?? null,
    inputCondition: dto.inputCondition ?? null,
    outputDeliverable: dto.outputDeliverable ?? null,
    outputDataDesc: dto.outputDataDesc ?? null,
    outputCondition: dto.outputCondition ?? null,
    issues: dto.issues ?? null,
    exceptions: dto.exceptions ?? null,
    remarks: dto.remarks ?? null,
  },
  ...dto.i18n,
});

/** Task 속성 대상 노드를 검증한다. */
const assertTaskNode = async (nodeId: number) => {
  const node = await processQueries.findProcessById(nodeId);
  if (!node) {
    throw new ApiError("E302", "Process not found", 404);
  }

  if (node.level !== "L3" && node.level !== "L4") {
    throw new ApiError(
      "E405",
      "Task attributes can only be managed for L3/L4 nodes",
      400,
      undefined,
      "nodeId",
    );
  }

  return node;
};

/** 선행 프로세스 저장 전 유효성을 검사한다. */
const validatePredecessors = async (
  nodeId: number,
  predecessors: UpsertTaskPredecessorDto[],
): Promise<UpsertTaskPredecessorDto[]> => {
  const seen = new Set<number>();
  const normalized: UpsertTaskPredecessorDto[] = [];

  for (const predecessor of predecessors) {
    const predecessorNodeId = Number(predecessor.predecessorNodeId);

    if (!Number.isFinite(predecessorNodeId)) {
      throw new ApiError("E001", "Invalid predecessor node", 400);
    }
    if (predecessorNodeId === nodeId) {
      throw new ApiError("E404", "Circular reference detected", 400);
    }
    if (seen.has(predecessorNodeId)) {
      continue;
    }

    const node = await processQueries.findProcessById(predecessorNodeId);
    if (!node) {
      throw new ApiError("E302", "Predecessor process not found", 404);
    }
    if (node.level !== "L3" && node.level !== "L4") {
      throw new ApiError(
        "E405",
        "Only L3/L4 processes can be selected as predecessors",
        400,
        undefined,
        "predecessorNodeId",
      );
    }

    const circular = await metadataQueries.hasPredecessorPath(
      predecessorNodeId,
      nodeId,
    );
    if (circular) {
      throw new ApiError("E404", "Circular reference detected", 400);
    }

    seen.add(predecessorNodeId);
    normalized.push({
      predecessorNodeId,
      conditionDesc: predecessor.conditionDesc?.trim() || null,
      isMandatory: predecessor.isMandatory ?? true,
    });
  }

  return normalized;
};

/** Task 속성 목록을 조회한다. */
export const listTaskAttributes = async (
  locale: Locale,
  filters: TaskAttributeListFilters = {},
): Promise<TaskAttributeListItem[]> => {
  return metadataQueries.listTaskAttributes(locale, filters);
};

/** Task 속성 상세를 조회한다. */
export const getTaskAttribute = async (
  nodeId: number,
  locale: Locale,
): Promise<TaskAttributeDto | null> => {
  await assertTaskNode(nodeId);

  const attribute = await metadataQueries.findTaskAttributeByNodeId(nodeId);
  if (!attribute) {
    return null;
  }

  const i18n = await metadataQueries.findTaskAttributeI18n(attribute.attrId);
  const predecessors = await metadataQueries.listTaskPredecessors(nodeId, locale);
  const resolved = metadataQueries.resolveTaskAttributeText(attribute, i18n, locale);

  return {
    ...attribute,
    ...resolved,
    i18n,
    predecessors,
  };
};

/** Task 속성과 선행 프로세스를 저장한다. */
export const upsertTaskAttribute = async (
  dto: UpsertTaskAttributeDto,
  locale: Locale,
  userId?: number,
): Promise<TaskAttributeDto> => {
  await assertTaskNode(dto.nodeId);

  const normalized = withKoFallback(dto);
  const attribute = await metadataQueries.upsertTaskAttribute({
    ...normalized,
    createdBy: userId ?? null,
    updatedBy: userId ?? null,
  });

  await metadataQueries.upsertTaskAttributeI18n(
    attribute.attrId,
    buildI18nMap(normalized),
  );

  if (normalized.predecessors) {
    const predecessors = await validatePredecessors(
      normalized.nodeId,
      normalized.predecessors,
    );
    await metadataQueries.replaceTaskPredecessors(normalized.nodeId, predecessors);
  }

  const result = await getTaskAttribute(normalized.nodeId, locale);
  if (!result) {
    throw new ApiError("E502", "Failed to save task attribute", 500);
  }

  return result;
};
