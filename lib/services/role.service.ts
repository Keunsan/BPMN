import "server-only";

import { ApiError } from "@/lib/api/error-handler";
import * as roleQueries from "@/lib/db/queries/role";
import type { RoleCategory, RoleDto, RoleListFilters, UpsertRoleDto } from "@/types/role";

const ROLE_CATEGORIES: RoleCategory[] = [
  "BUSINESS",
  "IT",
  "MANAGEMENT",
  "AUDIT",
  "EXTERNAL",
];

const normalizeRoleDto = (dto: UpsertRoleDto): UpsertRoleDto => {
  const roleCode = dto.roleCode?.trim();
  const roleName = dto.roleName?.trim();

  if (!roleCode) {
    throw new ApiError("E001", "Role code is required", 400, undefined, "roleCode");
  }

  if (!roleName) {
    throw new ApiError("E001", "Role name is required", 400, undefined, "roleName");
  }

  if (dto.roleCategory && !ROLE_CATEGORIES.includes(dto.roleCategory)) {
    throw new ApiError(
      "E001",
      "Invalid role category",
      400,
      undefined,
      "roleCategory",
    );
  }

  return {
    ...dto,
    roleCode,
    roleName,
    roleDescription: dto.roleDescription?.trim() || null,
    isActive: dto.isActive ?? true,
  };
};

/** 역할 목록을 조회한다. */
export const listRoles = async (
  filters: RoleListFilters = {},
): Promise<RoleDto[]> => roleQueries.listRoles(filters);

/** 역할을 생성한다. */
export const createRole = async (dto: UpsertRoleDto): Promise<RoleDto> => {
  const normalized = normalizeRoleDto(dto);
  const existing = await roleQueries.findRoleByCode(normalized.roleCode);

  if (existing) {
    throw new ApiError(
      "E409",
      "Role code already exists",
      409,
      undefined,
      "roleCode",
    );
  }

  return roleQueries.createRole(normalized);
};

/** 역할을 수정한다. */
export const updateRole = async (
  roleId: number,
  dto: UpsertRoleDto,
): Promise<RoleDto> => {
  const existing = await roleQueries.findRoleById(roleId);
  if (!existing) {
    throw new ApiError("E301", "Role not found", 404, undefined, "roleId");
  }

  const normalized = normalizeRoleDto(dto);
  const duplicate = await roleQueries.findRoleByCode(normalized.roleCode);

  if (duplicate && duplicate.roleId !== roleId) {
    throw new ApiError(
      "E409",
      "Role code already exists",
      409,
      undefined,
      "roleCode",
    );
  }

  const updated = await roleQueries.updateRole(roleId, normalized);
  if (!updated) {
    throw new ApiError("E301", "Role not found", 404, undefined, "roleId");
  }

  return updated;
};

/** 역할을 비활성화한다. */
export const deactivateRole = async (roleId: number): Promise<void> => {
  const existing = await roleQueries.findRoleById(roleId);
  if (!existing) {
    throw new ApiError("E301", "Role not found", 404, undefined, "roleId");
  }

  await roleQueries.deactivateRole(roleId);
};
