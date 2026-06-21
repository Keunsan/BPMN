import "server-only";

import { ApiError } from "@/lib/api/error-handler";
import * as organizationQueries from "@/lib/db/queries/organization";
import * as processQueries from "@/lib/db/queries/process";
import * as raciQueries from "@/lib/db/queries/raci";
import * as roleQueries from "@/lib/db/queries/role";
import type { RaciType } from "@/types/metadata";
import type { TaskRoleMappingDto, UpsertTaskRoleMappingDto } from "@/types/raci";

const RACI_TYPES: RaciType[] = [
  "RESPONSIBLE",
  "ACCOUNTABLE",
  "CONSULTED",
  "INFORMED",
];

/** RACI 대상 Task 노드를 검증한다. */
const assertTaskNode = async (nodeId: number) => {
  const node = await processQueries.findProcessById(nodeId);
  if (!node) {
    throw new ApiError("E302", "Process not found", 404, undefined, "nodeId");
  }

  if (node.level !== "L3" && node.level !== "L4") {
    throw new ApiError(
      "E405",
      "RACI mappings can only be managed for L3/L4 nodes",
      400,
      undefined,
      "nodeId",
    );
  }

  return node;
};

const normalizeMappingDto = (
  dto: UpsertTaskRoleMappingDto,
): UpsertTaskRoleMappingDto => {
  if (!RACI_TYPES.includes(dto.raciType)) {
    throw new ApiError(
      "E001",
      "Invalid RACI type",
      400,
      undefined,
      "raciType",
    );
  }

  if (!dto.orgId && !dto.roleId) {
    throw new ApiError(
      "E001",
      "Organization or role is required",
      400,
      undefined,
      "orgId",
    );
  }

  return {
    ...dto,
    orgId: dto.orgId ?? null,
    roleId: dto.roleId ?? null,
    description: dto.description?.trim() || null,
  };
};

const assertReferences = async (
  dto: UpsertTaskRoleMappingDto,
): Promise<void> => {
  if (dto.orgId) {
    const org = await organizationQueries.findOrganizationById(dto.orgId);
    if (!org || !org.isActive) {
      throw new ApiError("E301", "Organization not found", 404, undefined, "orgId");
    }
  }

  if (dto.roleId) {
    const role = await roleQueries.findRoleById(dto.roleId);
    if (!role || !role.isActive) {
      throw new ApiError("E301", "Role not found", 404, undefined, "roleId");
    }
  }
};

/** Task별 RACI 매핑 목록을 조회한다. */
export const listTaskRoleMappings = async (
  nodeId: number,
): Promise<TaskRoleMappingDto[]> => {
  await assertTaskNode(nodeId);
  return raciQueries.listTaskRoleMappings(nodeId);
};

/** RACI 매핑을 생성한다. */
export const createTaskRoleMapping = async (
  dto: UpsertTaskRoleMappingDto,
  userId: number | null,
): Promise<TaskRoleMappingDto> => {
  await assertTaskNode(dto.nodeId);
  const normalized = normalizeMappingDto(dto);
  await assertReferences(normalized);

  return raciQueries.createTaskRoleMapping(normalized, userId);
};

/** RACI 매핑을 수정한다. */
export const updateTaskRoleMapping = async (
  mappingId: number,
  dto: UpsertTaskRoleMappingDto,
  userId: number | null,
): Promise<TaskRoleMappingDto> => {
  await assertTaskNode(dto.nodeId);
  const normalized = normalizeMappingDto(dto);
  await assertReferences(normalized);

  const updated = await raciQueries.updateTaskRoleMapping(
    mappingId,
    normalized,
    userId,
  );

  if (!updated) {
    throw new ApiError("E301", "RACI mapping not found", 404, undefined, "mappingId");
  }

  return updated;
};

/** RACI 매핑을 삭제한다. */
export const deleteTaskRoleMapping = async (
  nodeId: number,
  mappingId: number,
): Promise<void> => {
  await assertTaskNode(nodeId);
  const existing = await raciQueries.findTaskRoleMappingById(nodeId, mappingId);
  if (!existing) {
    throw new ApiError("E301", "RACI mapping not found", 404, undefined, "mappingId");
  }

  await raciQueries.deleteTaskRoleMapping(nodeId, mappingId);
};
