import "server-only";

import type { RaciType } from "@/types/metadata";
import type { TaskRoleMappingDto, UpsertTaskRoleMappingDto } from "@/types/raci";

import { execute, query, queryOne, type QueryParams } from "../pool";

const mapTaskRoleMapping = (
  row: Record<string, unknown>,
): TaskRoleMappingDto => ({
  mappingId: Number(row.mapping_id),
  nodeId: Number(row.node_id),
  orgId:
    row.org_id === null || row.org_id === undefined ? null : Number(row.org_id),
  orgCode: (row.org_code as string | null) ?? null,
  orgName: (row.org_name as string | null) ?? null,
  roleId:
    row.role_id === null || row.role_id === undefined
      ? null
      : Number(row.role_id),
  roleCode: (row.role_code as string | null) ?? null,
  roleName: (row.role_name as string | null) ?? null,
  raciType: row.raci_type as RaciType,
  description: (row.description as string | null) ?? null,
  createdBy:
    row.created_by === null || row.created_by === undefined
      ? null
      : Number(row.created_by),
  createdAt: new Date(row.created_at as string),
  updatedBy:
    row.updated_by === null || row.updated_by === undefined
      ? null
      : Number(row.updated_by),
  updatedAt: row.updated_at ? new Date(row.updated_at as string) : null,
});

const baseSelectSql = `
  SELECT
    trm.*,
    o.org_code,
    o.org_name,
    r.role_code,
    r.role_name
  FROM task_role_mapping trm
  LEFT JOIN organization o ON trm.org_id = o.org_id
  LEFT JOIN role r ON trm.role_id = r.role_id
`;

/** Task별 RACI 매핑 목록을 조회한다. */
export const listTaskRoleMappings = async (
  nodeId: number,
): Promise<TaskRoleMappingDto[]> => {
  const rows = await query<Record<string, unknown>>(
    `${baseSelectSql}
     WHERE trm.node_id = @nodeId
     ORDER BY trm.raci_type, o.org_name, r.role_name, trm.mapping_id`,
    { nodeId },
  );

  return rows.map(mapTaskRoleMapping);
};

/** RACI 매핑 상세를 조회한다. */
export const findTaskRoleMappingById = async (
  nodeId: number,
  mappingId: number,
): Promise<TaskRoleMappingDto | null> => {
  const row = await queryOne<Record<string, unknown>>(
    `${baseSelectSql}
     WHERE trm.node_id = @nodeId AND trm.mapping_id = @mappingId`,
    { nodeId, mappingId },
  );

  return row ? mapTaskRoleMapping(row) : null;
};

/** RACI 매핑을 생성한다. */
export const createTaskRoleMapping = async (
  input: UpsertTaskRoleMappingDto,
  userId: number | null,
): Promise<TaskRoleMappingDto> => {
  const row = await queryOne<Record<string, unknown>>(
    `INSERT INTO task_role_mapping (
       node_id, org_id, role_id, raci_type, description, created_by
     )
     OUTPUT INSERTED.mapping_id
     VALUES (
       @nodeId, @orgId, @roleId, @raciType, @description, @createdBy
     )`,
    { ...mappingParams(input), createdBy: userId },
  );

  const mappingId = row?.mapping_id as number | undefined;
  if (!mappingId) {
    throw new Error("Failed to create task role mapping");
  }

  const created = await findTaskRoleMappingById(input.nodeId, mappingId);
  if (!created) {
    throw new Error("Failed to load task role mapping");
  }

  return created;
};

/** RACI 매핑을 수정한다. */
export const updateTaskRoleMapping = async (
  mappingId: number,
  input: UpsertTaskRoleMappingDto,
  userId: number | null,
): Promise<TaskRoleMappingDto | null> => {
  await execute(
    `UPDATE task_role_mapping
     SET org_id = @orgId,
         role_id = @roleId,
         raci_type = @raciType,
         description = @description,
         updated_by = @updatedBy,
         updated_at = GETDATE()
     WHERE node_id = @nodeId AND mapping_id = @mappingId`,
    { mappingId, ...mappingParams(input), updatedBy: userId },
  );

  return findTaskRoleMappingById(input.nodeId, mappingId);
};

/** RACI 매핑을 삭제한다. */
export const deleteTaskRoleMapping = async (
  nodeId: number,
  mappingId: number,
): Promise<void> => {
  await execute(
    "DELETE FROM task_role_mapping WHERE node_id = @nodeId AND mapping_id = @mappingId",
    { nodeId, mappingId },
  );
};

const mappingParams = (input: UpsertTaskRoleMappingDto): QueryParams => ({
  nodeId: input.nodeId,
  orgId: input.orgId ?? null,
  roleId: input.roleId ?? null,
  raciType: input.raciType,
  description: input.description?.trim() || null,
});
