import "server-only";

import type {
  TaskDataTableLinkDto,
  UpsertTaskDataTableLinkDto,
} from "@/types/data-table";

import { execute, query, queryOne, type QueryParams } from "../pool";

/** task_data_table_link 행을 DTO로 변환한다. */
const mapTaskDataTableLink = (
  row: Record<string, unknown>,
): TaskDataTableLinkDto => ({
  linkId: row.link_id as number,
  nodeId: row.node_id as number,
  systemId: row.system_id as number,
  systemCode: row.system_code as string,
  systemName: row.system_name as string,
  schemaName: (row.schema_name as string | null) ?? null,
  tableName: row.table_name as string,
  tableNameKor: (row.table_name_kor as string | null) ?? null,
  linkType: row.link_type as TaskDataTableLinkDto["linkType"],
  crudType: (row.crud_type as TaskDataTableLinkDto["crudType"]) ?? null,
  keyColumns: (row.key_columns as string | null) ?? null,
  filterCondition: (row.filter_condition as string | null) ?? null,
  description: (row.description as string | null) ?? null,
  dataVolume: (row.data_volume as TaskDataTableLinkDto["dataVolume"]) ?? null,
  isCritical: Boolean(row.is_critical),
  createdBy: (row.created_by as number | null) ?? null,
  createdAt: new Date(row.created_at as string),
  updatedBy: (row.updated_by as number | null) ?? null,
  updatedAt: row.updated_at ? new Date(row.updated_at as string) : null,
});

/** Task별 데이터 테이블 연결 목록을 조회한다. */
export const listTaskDataTableLinks = async (
  nodeId: number,
): Promise<TaskDataTableLinkDto[]> => {
  const rows = await query<Record<string, unknown>>(
    `SELECT
       link.*,
       s.system_code,
       s.system_name
     FROM task_data_table_link link
     INNER JOIN application_system s ON link.system_id = s.system_id
     WHERE link.node_id = @nodeId
     ORDER BY link.link_type, s.system_code, link.schema_name, link.table_name`,
    { nodeId },
  );

  return rows.map(mapTaskDataTableLink);
};

/** 데이터 테이블 연결 상세를 조회한다. */
export const findTaskDataTableLinkById = async (
  nodeId: number,
  linkId: number,
): Promise<TaskDataTableLinkDto | null> => {
  const row = await queryOne<Record<string, unknown>>(
    `SELECT
       link.*,
       s.system_code,
       s.system_name
     FROM task_data_table_link link
     INNER JOIN application_system s ON link.system_id = s.system_id
     WHERE link.node_id = @nodeId AND link.link_id = @linkId`,
    { nodeId, linkId },
  );

  return row ? mapTaskDataTableLink(row) : null;
};

/** 데이터 테이블 연결을 생성한다. */
export const createTaskDataTableLink = async (
  input: UpsertTaskDataTableLinkDto,
  userId: number | null,
): Promise<TaskDataTableLinkDto> => {
  const row = await queryOne<Record<string, unknown>>(
    `INSERT INTO task_data_table_link (
       node_id, system_id, schema_name, table_name, table_name_kor, link_type,
       crud_type, key_columns, filter_condition, description, data_volume,
       is_critical, created_by
     )
     OUTPUT INSERTED.link_id
     VALUES (
       @nodeId, @systemId, @schemaName, @tableName, @tableNameKor, @linkType,
       @crudType, @keyColumns, @filterCondition, @description, @dataVolume,
       @isCritical, @createdBy
     )`,
    { ...linkParams(input), createdBy: userId },
  );

  const linkId = row?.link_id as number | undefined;
  if (!linkId) {
    throw new Error("Failed to create data table link");
  }

  const created = await findTaskDataTableLinkById(input.nodeId, linkId);
  if (!created) {
    throw new Error("Failed to load data table link");
  }

  return created;
};

/** 데이터 테이블 연결을 수정한다. */
export const updateTaskDataTableLink = async (
  linkId: number,
  input: UpsertTaskDataTableLinkDto,
  userId: number | null,
): Promise<TaskDataTableLinkDto | null> => {
  await execute(
    `UPDATE task_data_table_link
     SET system_id = @systemId,
         schema_name = @schemaName,
         table_name = @tableName,
         table_name_kor = @tableNameKor,
         link_type = @linkType,
         crud_type = @crudType,
         key_columns = @keyColumns,
         filter_condition = @filterCondition,
         description = @description,
         data_volume = @dataVolume,
         is_critical = @isCritical,
         updated_by = @updatedBy,
         updated_at = GETDATE()
     WHERE node_id = @nodeId AND link_id = @linkId`,
    { linkId, ...linkParams(input), updatedBy: userId },
  );

  return findTaskDataTableLinkById(input.nodeId, linkId);
};

/** 데이터 테이블 연결을 삭제한다. */
export const deleteTaskDataTableLink = async (
  nodeId: number,
  linkId: number,
): Promise<void> => {
  await execute(
    "DELETE FROM task_data_table_link WHERE node_id = @nodeId AND link_id = @linkId",
    { nodeId, linkId },
  );
};

const linkParams = (input: UpsertTaskDataTableLinkDto): QueryParams => ({
  nodeId: input.nodeId,
  systemId: input.systemId,
  schemaName: input.schemaName ?? null,
  tableName: input.tableName,
  tableNameKor: input.tableNameKor ?? null,
  linkType: input.linkType,
  crudType: input.crudType ?? null,
  keyColumns: input.keyColumns ?? null,
  filterCondition: input.filterCondition ?? null,
  description: input.description ?? null,
  dataVolume: input.dataVolume ?? null,
  isCritical: input.isCritical ? 1 : 0,
});
