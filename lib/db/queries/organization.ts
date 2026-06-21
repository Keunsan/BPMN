import "server-only";

import type {
  OrganizationDto,
  OrganizationHrMergeInput,
  OrganizationListFilters,
  OrganizationMergeResult,
  OrganizationType,
  OrganizationUpsertInput,
} from "@/types/organization";

import { execute, query, queryOne, transaction, type QueryParams } from "../pool";

const mapOrganization = (row: Record<string, unknown>): OrganizationDto => ({
  orgId: Number(row.org_id),
  parentOrgId:
    row.parent_org_id === null || row.parent_org_id === undefined
      ? null
      : Number(row.parent_org_id),
  orgCode: row.org_code as string,
  orgName: row.org_name as string,
  orgType: row.org_type as OrganizationType,
  orgLevel:
    row.org_level === null || row.org_level === undefined
      ? null
      : Number(row.org_level),
  buCd: (row.bu_cd as string | null) ?? null,
  costCd: (row.cost_cd as string | null) ?? null,
  costName: (row.cost_nm as string | null) ?? null,
  leaderEmployeeId: (row.leader_employee_id as string | null) ?? null,
  leaderName: (row.leader_name as string | null) ?? null,
  isLeaf:
    row.is_leaf === null || row.is_leaf === undefined
      ? null
      : Boolean(row.is_leaf),
  source: (row.source as OrganizationDto["source"]) ?? "HR_ERP",
  isActive: Boolean(row.is_active),
  createdAt: new Date(row.created_at as string),
  updatedAt: row.updated_at ? new Date(row.updated_at as string) : null,
});

const buildListWhere = (
  filters: OrganizationListFilters,
): { whereSql: string; params: QueryParams } => {
  const clauses: string[] = [];
  const params: QueryParams = {};

  if (filters.isActive !== undefined) {
    clauses.push("o.is_active = @isActive");
    params.isActive = filters.isActive ? 1 : 0;
  }

  if (filters.buCd) {
    clauses.push("o.bu_cd = @buCd");
    params.buCd = filters.buCd;
  }

  if (filters.leafOnly) {
    clauses.push("o.is_leaf = 1");
  }

  if (filters.search?.trim()) {
    clauses.push("(o.org_code LIKE @search OR o.org_name LIKE @search)");
    params.search = `%${filters.search.trim()}%`;
  }

  return {
    whereSql: clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "",
    params,
  };
};

/** 조직 목록을 조회한다. */
export const listOrganizations = async (
  filters: OrganizationListFilters = {},
): Promise<OrganizationDto[]> => {
  const { whereSql, params } = buildListWhere(filters);
  const rows = await query<Record<string, unknown>>(
    `SELECT o.*
     FROM organization o
     ${whereSql}
     ORDER BY o.org_code`,
    params,
  );

  return rows.map(mapOrganization);
};

/** 조직 코드로 조직을 조회한다. */
export const findOrganizationByCode = async (
  orgCode: string,
): Promise<OrganizationDto | null> => {
  const row = await queryOne<Record<string, unknown>>(
    "SELECT * FROM organization WHERE org_code = @orgCode",
    { orgCode },
  );

  return row ? mapOrganization(row) : null;
};

/** 조직 ID로 조직을 조회한다. */
export const findOrganizationById = async (
  orgId: number,
): Promise<OrganizationDto | null> => {
  const row = await queryOne<Record<string, unknown>>(
    "SELECT * FROM organization WHERE org_id = @orgId",
    { orgId },
  );

  return row ? mapOrganization(row) : null;
};

/** HR 조직 정보를 UPSERT한다. */
export const upsertOrganization = async (
  input: OrganizationUpsertInput,
): Promise<number> => {
  const existing = await findOrganizationByCode(input.orgCode);

  if (existing) {
    await execute(
      `UPDATE organization
       SET org_name = @orgName,
           org_type = @orgType,
           org_level = @orgLevel,
           bu_cd = @buCd,
           leader_employee_id = @leaderEmployeeId,
           leader_name = @leaderName,
           is_leaf = @isLeaf,
           source = @source,
           is_active = @isActive,
           updated_at = GETDATE()
       WHERE org_id = @orgId`,
      {
        orgId: existing.orgId,
        orgName: input.orgName,
        orgType: input.orgType,
        orgLevel: input.orgLevel,
        buCd: input.buCd,
        leaderEmployeeId: input.leaderEmployeeId,
        leaderName: input.leaderName,
        isLeaf: input.isLeaf ? 1 : 0,
        source: input.source,
        isActive: input.isActive ? 1 : 0,
      },
    );

    return existing.orgId;
  }

  const row = await queryOne<Record<string, unknown>>(
    `INSERT INTO organization (
       org_code, org_name, org_type, org_level, bu_cd,
       leader_employee_id, leader_name, is_leaf, source, is_active
     )
     OUTPUT INSERTED.org_id
     VALUES (
       @orgCode, @orgName, @orgType, @orgLevel, @buCd,
       @leaderEmployeeId, @leaderName, @isLeaf, @source, @isActive
     )`,
    {
      orgCode: input.orgCode,
      orgName: input.orgName,
      orgType: input.orgType,
      orgLevel: input.orgLevel,
      buCd: input.buCd,
      leaderEmployeeId: input.leaderEmployeeId,
      leaderName: input.leaderName,
      isLeaf: input.isLeaf ? 1 : 0,
      source: input.source,
      isActive: input.isActive ? 1 : 0,
    },
  );

  const orgId = row?.org_id as number | undefined;
  if (!orgId) {
    throw new Error("Failed to upsert organization");
  }

  return orgId;
};

/** 상위 조직 FK를 연결한다. */
export const updateOrganizationParent = async (
  orgCode: string,
  parentOrgCode: string | null,
): Promise<boolean> => {
  if (!parentOrgCode) {
    await execute(
      `UPDATE organization
       SET parent_org_id = NULL, updated_at = GETDATE()
       WHERE org_code = @orgCode`,
      { orgCode },
    );
    return true;
  }

  const parent = await findOrganizationByCode(parentOrgCode);
  if (!parent) {
    return false;
  }

  await execute(
    `UPDATE organization
     SET parent_org_id = @parentOrgId, updated_at = GETDATE()
     WHERE org_code = @orgCode`,
    { orgCode, parentOrgId: parent.orgId },
  );

  return true;
};

/** HR 동기화 대상에서 제외된 조직을 비활성화한다. */
export const deactivateOrganizationsExcept = async (
  activeOrgCodes: string[],
): Promise<number> => {
  if (activeOrgCodes.length === 0) {
    return 0;
  }

  const placeholders = activeOrgCodes.map((_, index) => `@code${index}`);
  const params: QueryParams = { source: "HR_ERP" };
  activeOrgCodes.forEach((code, index) => {
    params[`code${index}`] = code;
  });

  const result = await execute(
    `UPDATE organization
     SET is_active = 0, updated_at = GETDATE()
     WHERE source = @source
       AND org_code NOT IN (${placeholders.join(", ")})
       AND is_active = 1`,
    params,
  );

  return result.rowsAffected?.[0] ?? 0;
};

/** HR 동기화용 조직 코드 목록을 조회한다. */
export const listOrganizationCodesBySource = async (
  source: OrganizationDto["source"],
): Promise<string[]> => {
  const rows = await query<{ org_code: string }>(
    "SELECT org_code FROM organization WHERE source = @source",
    { source },
  );

  return rows.map((row) => row.org_code);
};

type MergeActionRow = { action: "INSERT" | "UPDATE" | "DELETE" };

const buildHrMergeValueParams = (
  rows: OrganizationHrMergeInput[],
  prefix: string,
): { valuesSql: string; params: QueryParams } => {
  const params: QueryParams = {};
  const valueTuples = rows.map((row, index) => {
    params[`${prefix}OrgCode${index}`] = row.orgCode;
    params[`${prefix}OrgName${index}`] = row.orgName;
    params[`${prefix}OrgType${index}`] = row.orgType;
    params[`${prefix}OrgLevel${index}`] = row.orgLevel;
    params[`${prefix}BuCd${index}`] = row.buCd;
    params[`${prefix}CostCd${index}`] = row.costCd;
    params[`${prefix}CostNm${index}`] = row.costName;
    params[`${prefix}LeaderEmployeeId${index}`] = row.leaderEmployeeId;
    params[`${prefix}LeaderName${index}`] = row.leaderName;
    params[`${prefix}IsLeaf${index}`] = row.isLeaf ? 1 : 0;
    params[`${prefix}ParentOrgCode${index}`] = row.parentOrgCode;

    return `(@${prefix}OrgCode${index}, @${prefix}OrgName${index}, @${prefix}OrgType${index}, @${prefix}OrgLevel${index}, @${prefix}BuCd${index}, @${prefix}CostCd${index}, @${prefix}CostNm${index}, @${prefix}LeaderEmployeeId${index}, @${prefix}LeaderName${index}, @${prefix}IsLeaf${index}, @${prefix}ParentOrgCode${index})`;
  });

  return {
    valuesSql: valueTuples.join(",\n"),
    params,
  };
};

const countParentLinked = (rows: OrganizationHrMergeInput[]): number => {
  const orgCodes = new Set(rows.map((row) => row.orgCode));

  return rows.filter((row) => {
    if (!row.parentOrgCode) {
      return true;
    }
    return orgCodes.has(row.parentOrgCode);
  }).length;
};

const buildDeactivateSql = (
  activeOrgCodes: string[],
): { sql: string; params: QueryParams } => {
  const placeholders = activeOrgCodes.map((_, index) => `@code${index}`);
  const params: QueryParams = { source: "HR_ERP" };
  activeOrgCodes.forEach((code, index) => {
    params[`code${index}`] = code;
  });

  return {
    sql: `UPDATE organization
          SET is_active = 0, updated_at = GETDATE()
          WHERE source = @source
            AND org_code NOT IN (${placeholders.join(", ")})
            AND is_active = 1`,
    params,
  };
};

/** HR ERP 부서 목록을 organization 테이블에 일괄 MERGE한다. */
export const mergeOrganizationsFromHr = async (
  rows: OrganizationHrMergeInput[],
): Promise<OrganizationMergeResult> => {
  if (rows.length === 0) {
    return { inserted: 0, updated: 0, parentLinked: 0, deactivated: 0 };
  }

  return transaction(async (txRequest) => {
    const { valuesSql, params: mergeParams } = buildHrMergeValueParams(rows, "m");

    const mergeResult = await txRequest(
      `MERGE organization AS target
       USING (
         VALUES
         ${valuesSql}
       ) AS source (
         org_code, org_name, org_type, org_level, bu_cd, cost_cd, cost_nm,
         leader_employee_id, leader_name, is_leaf, parent_org_code
       )
       ON target.org_code = source.org_code
       WHEN MATCHED THEN
         UPDATE SET
           org_name = source.org_name,
           org_type = source.org_type,
           org_level = source.org_level,
           bu_cd = source.bu_cd,
           cost_cd = source.cost_cd,
           cost_nm = source.cost_nm,
           leader_employee_id = source.leader_employee_id,
           leader_name = source.leader_name,
           is_leaf = source.is_leaf,
           source = 'HR_ERP',
           is_active = 1,
           updated_at = GETDATE()
       WHEN NOT MATCHED THEN
         INSERT (
           org_code, org_name, org_type, org_level, bu_cd, cost_cd, cost_nm,
           leader_employee_id, leader_name, is_leaf, source, is_active
         )
         VALUES (
           source.org_code, source.org_name, source.org_type, source.org_level, source.bu_cd,
           source.cost_cd, source.cost_nm,
           source.leader_employee_id, source.leader_name, source.is_leaf, 'HR_ERP', 1
         )
       OUTPUT $action AS action;`,
      mergeParams,
    );

    const actions = (mergeResult.recordset ?? []) as MergeActionRow[];
    const inserted = actions.filter((row) => row.action === "INSERT").length;
    const updated = actions.filter((row) => row.action === "UPDATE").length;

    await txRequest(
      `UPDATE child
       SET child.parent_org_id = CASE
             WHEN NULLIF(LTRIM(RTRIM(source.parent_org_code)), '') IS NULL THEN NULL
             ELSE parent.org_id
           END,
           child.updated_at = GETDATE()
       FROM organization child
       INNER JOIN (
         VALUES
         ${valuesSql}
       ) AS source (
         org_code, org_name, org_type, org_level, bu_cd, cost_cd, cost_nm,
         leader_employee_id, leader_name, is_leaf, parent_org_code
       )
         ON child.org_code = source.org_code
       LEFT JOIN organization parent
         ON parent.org_code = source.parent_org_code
       WHERE child.source = 'HR_ERP'`,
      mergeParams,
    );

    const { sql: deactivateSql, params: deactivateParams } = buildDeactivateSql(
      rows.map((row) => row.orgCode),
    );
    const deactivateResult = await txRequest(deactivateSql, deactivateParams);

    return {
      inserted,
      updated,
      parentLinked: countParentLinked(rows),
      deactivated: deactivateResult.rowsAffected?.[0] ?? 0,
    };
  });
};
