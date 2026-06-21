import "server-only";

import type { RoleCategory, RoleDto, RoleListFilters, UpsertRoleDto } from "@/types/role";

import { execute, query, queryOne, type QueryParams } from "../pool";

const mapRole = (row: Record<string, unknown>): RoleDto => ({
  roleId: Number(row.role_id),
  roleCode: row.role_code as string,
  roleName: row.role_name as string,
  roleDescription: (row.role_description as string | null) ?? null,
  roleCategory: (row.role_category as RoleCategory | null) ?? null,
  isActive: Boolean(row.is_active),
  createdAt: new Date(row.created_at as string),
  updatedAt: row.updated_at ? new Date(row.updated_at as string) : null,
});

const buildListWhere = (
  filters: RoleListFilters,
): { whereSql: string; params: QueryParams } => {
  const clauses: string[] = [];
  const params: QueryParams = {};

  if (filters.isActive !== undefined) {
    clauses.push("r.is_active = @isActive");
    params.isActive = filters.isActive ? 1 : 0;
  }

  if (filters.roleCategory) {
    clauses.push("r.role_category = @roleCategory");
    params.roleCategory = filters.roleCategory;
  }

  if (filters.search?.trim()) {
    clauses.push("(r.role_code LIKE @search OR r.role_name LIKE @search)");
    params.search = `%${filters.search.trim()}%`;
  }

  return {
    whereSql: clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "",
    params,
  };
};

/** 역할 목록을 조회한다. */
export const listRoles = async (
  filters: RoleListFilters = {},
): Promise<RoleDto[]> => {
  const { whereSql, params } = buildListWhere(filters);
  const rows = await query<Record<string, unknown>>(
    `SELECT r.*
     FROM role r
     ${whereSql}
     ORDER BY r.role_code`,
    params,
  );

  return rows.map(mapRole);
};

/** 역할 ID로 조회한다. */
export const findRoleById = async (roleId: number): Promise<RoleDto | null> => {
  const row = await queryOne<Record<string, unknown>>(
    "SELECT * FROM role WHERE role_id = @roleId",
    { roleId },
  );

  return row ? mapRole(row) : null;
};

/** 역할 코드로 조회한다. */
export const findRoleByCode = async (
  roleCode: string,
): Promise<RoleDto | null> => {
  const row = await queryOne<Record<string, unknown>>(
    "SELECT * FROM role WHERE role_code = @roleCode",
    { roleCode },
  );

  return row ? mapRole(row) : null;
};

/** 역할을 생성한다. */
export const createRole = async (input: UpsertRoleDto): Promise<RoleDto> => {
  const row = await queryOne<Record<string, unknown>>(
    `INSERT INTO role (
       role_code, role_name, role_description, role_category, is_active
     )
     OUTPUT INSERTED.role_id
     VALUES (
       @roleCode, @roleName, @roleDescription, @roleCategory, @isActive
     )`,
    roleParams(input),
  );

  const roleId = row?.role_id as number | undefined;
  if (!roleId) {
    throw new Error("Failed to create role");
  }

  const created = await findRoleById(roleId);
  if (!created) {
    throw new Error("Failed to load role");
  }

  return created;
};

/** 역할을 수정한다. */
export const updateRole = async (
  roleId: number,
  input: UpsertRoleDto,
): Promise<RoleDto | null> => {
  await execute(
    `UPDATE role
     SET role_code = @roleCode,
         role_name = @roleName,
         role_description = @roleDescription,
         role_category = @roleCategory,
         is_active = @isActive,
         updated_at = GETDATE()
     WHERE role_id = @roleId`,
    { roleId, ...roleParams(input) },
  );

  return findRoleById(roleId);
};

/** 역할을 비활성화한다. */
export const deactivateRole = async (roleId: number): Promise<void> => {
  await execute(
    `UPDATE role
     SET is_active = 0, updated_at = GETDATE()
     WHERE role_id = @roleId`,
    { roleId },
  );
};

const roleParams = (input: UpsertRoleDto): QueryParams => ({
  roleCode: input.roleCode.trim(),
  roleName: input.roleName.trim(),
  roleDescription: input.roleDescription?.trim() || null,
  roleCategory: input.roleCategory ?? null,
  isActive: input.isActive === false ? 0 : 1,
});
