import "server-only";

import { ApiError } from "@/lib/api/error-handler";
import * as dataTableQueries from "@/lib/db/queries/data-table";
import * as processQueries from "@/lib/db/queries/process";
import * as systemQueries from "@/lib/db/queries/system";
import type {
  TaskDataTableLinkDto,
  UpsertTaskDataTableLinkDto,
} from "@/types/data-table";

/** 데이터 연결 대상 L3/L4 프로세스인지 확인한다. */
const assertTaskNode = async (nodeId: number): Promise<void> => {
  const node = await processQueries.findProcessById(nodeId);
  if (!node) {
    throw new ApiError("E302", "Process not found", 404, undefined, "nodeId");
  }
  if (node.level !== "L3" && node.level !== "L4") {
    throw new ApiError(
      "E405",
      "Data table links can only be managed for L3/L4 nodes",
      400,
      undefined,
      "nodeId",
    );
  }
};

const normalizeLinkDto = (
  dto: UpsertTaskDataTableLinkDto,
): UpsertTaskDataTableLinkDto => {
  if (!dto.tableName?.trim()) {
    throw new ApiError("E001", "Table name is required", 400, undefined, "tableName");
  }

  return {
    ...dto,
    schemaName: dto.schemaName?.trim() || null,
    tableName: dto.tableName.trim(),
    tableNameKor: dto.tableNameKor?.trim() || null,
    keyColumns: dto.keyColumns?.trim() || null,
    filterCondition: dto.filterCondition?.trim() || null,
    description: dto.description?.trim() || null,
    crudType: dto.crudType ?? null,
    dataVolume: dto.dataVolume ?? null,
    isCritical: dto.isCritical ?? false,
  };
};

/** Task별 데이터 테이블 연결 목록을 조회한다. */
export const listTaskDataTableLinks = async (
  nodeId: number,
): Promise<TaskDataTableLinkDto[]> => {
  await assertTaskNode(nodeId);
  return dataTableQueries.listTaskDataTableLinks(nodeId);
};

/** 데이터 테이블 연결을 생성한다. */
export const createTaskDataTableLink = async (
  dto: UpsertTaskDataTableLinkDto,
  userId: number,
): Promise<TaskDataTableLinkDto> => {
  await assertTaskNode(dto.nodeId);
  if (!(await systemQueries.findSystemById(dto.systemId))) {
    throw new ApiError("E301", "System not found", 404, undefined, "systemId");
  }

  return dataTableQueries.createTaskDataTableLink(normalizeLinkDto(dto), userId);
};

/** 데이터 테이블 연결을 수정한다. */
export const updateTaskDataTableLink = async (
  linkId: number,
  dto: UpsertTaskDataTableLinkDto,
  userId: number,
): Promise<TaskDataTableLinkDto> => {
  await assertTaskNode(dto.nodeId);
  if (!(await systemQueries.findSystemById(dto.systemId))) {
    throw new ApiError("E301", "System not found", 404, undefined, "systemId");
  }

  const updated = await dataTableQueries.updateTaskDataTableLink(
    linkId,
    normalizeLinkDto(dto),
    userId,
  );
  if (!updated) {
    throw new ApiError("E301", "Data table link not found", 404);
  }

  return updated;
};

/** 데이터 테이블 연결을 삭제한다. */
export const deleteTaskDataTableLink = async (
  nodeId: number,
  linkId: number,
): Promise<void> => {
  await assertTaskNode(nodeId);
  await dataTableQueries.deleteTaskDataTableLink(nodeId, linkId);
};
