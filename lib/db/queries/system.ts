import "server-only";

import type { Locale } from "@/lib/i18n/config";
import type {
  ApplicationSystem,
  ApplicationSystemDto,
  BatchCreateTaskSystemMappingDto,
  CreateTaskSystemMappingDto,
  ScreenCatalogFilters,
  ScreenCatalogItem,
  SystemHierarchyDto,
  SystemListFilters,
  SystemModuleDto,
  SystemModuleOption,
  SystemScreen,
  SystemScreenDto,
  SystemScreenListFilters,
  TaskSystemMappingDto,
  UpsertApplicationSystemDto,
  UpsertSystemScreenDto,
} from "@/types/system";

import { execute, query, queryOne, type QueryParams } from "../pool";

/** JSON 설정 문자열을 안전하게 객체로 변환한다. */
const parseJsonConfig = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== "string") {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
};

const toNumber = (value: unknown): number => Number(value);

const toNullableNumber = (value: unknown): number | null =>
  value === null || value === undefined ? null : Number(value);

/** application_system 행을 도메인 타입으로 변환한다. */
const mapSystem = (row: Record<string, unknown>): ApplicationSystem => ({
  systemId: toNumber(row.system_id),
  systemCode: row.system_code as string,
  systemName: row.system_name as string,
  systemType: row.system_type as ApplicationSystem["systemType"],
  companyCode: (row.company_code as string | null) ?? null,
  businessUnitCode: (row.business_unit_code as string | null) ?? null,
  vendor: (row.vendor as string | null) ?? null,
  version: (row.version as string | null) ?? null,
  description: (row.description as string | null) ?? null,
  systemOwnerId: toNullableNumber(row.system_owner_id),
  isActive: Boolean(row.is_active),
  tableApiUrl: (row.table_api_url as string | null) ?? null,
  tableApiAuthType:
    (row.table_api_auth_type as ApplicationSystem["tableApiAuthType"]) ?? null,
  tableApiConfig: parseJsonConfig(row.table_api_config),
  columnApiUrl: (row.column_api_url as string | null) ?? null,
  createdAt: new Date(row.created_at as string),
  updatedAt: row.updated_at ? new Date(row.updated_at as string) : null,
});

/** system_screen 행을 도메인 타입으로 변환한다. */
const mapScreen = (row: Record<string, unknown>): SystemScreen => ({
  screenId: row.screen_id as number,
  systemId: row.system_id as number,
  moduleCode: row.module_code as string,
  menuId: row.menu_id as string,
  screenCode: row.screen_code as string,
  screenName: row.screen_name as string,
  transactionCode: (row.transaction_code as string | null) ?? null,
  menuPath: (row.menu_path as string | null) ?? null,
  screenType: (row.screen_type as SystemScreen["screenType"]) ?? null,
  url: (row.url as string | null) ?? null,
  description: (row.description as string | null) ?? null,
  isActive: Boolean(row.is_active),
  createdAt: new Date(row.created_at as string),
});

const mapScreenDto = (row: Record<string, unknown>): SystemScreenDto => ({
  ...mapScreen(row),
  systemCode: row.system_code as string,
  systemName: row.system_name as string,
  moduleName: (row.module_name as string | null) ?? row.module_code as string,
});

/** 시스템 목록을 조회한다. */
export const listSystems = async (
  filters: SystemListFilters = {},
  locale: Locale = "ko",
): Promise<ApplicationSystemDto[]> => {
  const conditions = ["1=1"];
  const params: QueryParams = { locale };

  if (filters.search?.trim()) {
    conditions.push(
      "(s.system_code LIKE @search OR s.system_name LIKE @search OR s.description LIKE @search)",
    );
    params.search = `%${filters.search.trim()}%`;
  }
  if (filters.systemType) {
    conditions.push("s.system_type = @systemType");
    params.systemType = filters.systemType;
  }
  if (filters.companyCode) {
    conditions.push("s.company_code = @companyCode");
    params.companyCode = filters.companyCode;
  }
  if (filters.businessUnitCode) {
    conditions.push("s.business_unit_code = @businessUnitCode");
    params.businessUnitCode = filters.businessUnitCode;
  }
  if (filters.isActive !== undefined) {
    conditions.push("s.is_active = @isActive");
    params.isActive = filters.isActive ? 1 : 0;
  }

  const rows = await query<Record<string, unknown>>(
    `SELECT
       s.*,
       COALESCE(company_i18n.code_name, company_code.code_name) AS company_name,
       COALESCE(bu_i18n.code_name, bu_code.code_name) AS business_unit_name,
       (
         SELECT COUNT(DISTINCT sc.module_code)
         FROM system_screen sc
         WHERE sc.system_id = s.system_id
           AND sc.is_active = 1
       ) AS module_count,
       (
         SELECT COUNT(*)
         FROM system_screen sc
         WHERE sc.system_id = s.system_id
       ) AS screen_count
     FROM application_system s
     LEFT JOIN common_code company_code
       ON company_code.group_code = 'COMPANY_CD'
      AND company_code.code = s.company_code
     LEFT JOIN common_code_i18n company_i18n
       ON company_i18n.group_code = company_code.group_code
      AND company_i18n.code = company_code.code
      AND company_i18n.locale = @locale
     LEFT JOIN common_code bu_code
       ON bu_code.group_code = 'BU_CD'
      AND bu_code.code = s.business_unit_code
     LEFT JOIN common_code_i18n bu_i18n
       ON bu_i18n.group_code = bu_code.group_code
      AND bu_i18n.code = bu_code.code
      AND bu_i18n.locale = @locale
     WHERE ${conditions.join(" AND ")}
     ORDER BY s.is_active DESC, s.system_code, s.company_code, s.business_unit_code`,
    params,
  );

  return rows.map((row) => ({
    ...mapSystem(row),
    companyName: (row.company_name as string | null) ?? null,
    businessUnitName: (row.business_unit_name as string | null) ?? null,
    moduleCount: toNumber(row.module_count),
    screenCount: toNumber(row.screen_count),
  }));
};

/** 시스템 상세를 조회한다. */
export const findSystemById = async (
  systemId: number,
): Promise<ApplicationSystem | null> => {
  const row = await queryOne<Record<string, unknown>>(
    "SELECT * FROM application_system WHERE system_id = @systemId",
    { systemId },
  );

  return row ? mapSystem(row) : null;
};

/** 법인·사업부·시스템 코드로 시스템 ID를 조회한다. */
export const findSystemByScope = async (
  systemCode: string,
  companyCode: string,
  businessUnitCode: string,
): Promise<ApplicationSystem | null> => {
  const row = await queryOne<Record<string, unknown>>(
    `SELECT *
     FROM application_system
     WHERE system_code = @systemCode
       AND company_code = @companyCode
       AND business_unit_code = @businessUnitCode`,
    { systemCode, companyCode, businessUnitCode },
  );

  return row ? mapSystem(row) : null;
};

/** 시스템 식별 조합 중복 여부를 확인한다. */
export const existsSystemIdentity = async (
  systemCode: string,
  companyCode: string,
  businessUnitCode: string,
  excludeSystemId?: number,
): Promise<boolean> => {
  const params: QueryParams = { systemCode, companyCode, businessUnitCode };
  let sql = `SELECT 1 AS found
             FROM application_system
             WHERE system_code = @systemCode
               AND company_code = @companyCode
               AND business_unit_code = @businessUnitCode`;

  if (excludeSystemId) {
    sql += " AND system_id <> @excludeSystemId";
    params.excludeSystemId = excludeSystemId;
  }

  return Boolean(await queryOne<Record<string, unknown>>(sql, params));
};

/** 시스템을 생성한다. */
export const createSystem = async (
  input: UpsertApplicationSystemDto,
): Promise<ApplicationSystem> => {
  const row = await queryOne<Record<string, unknown>>(
    `INSERT INTO application_system (
       system_code, system_name, system_type, company_code, business_unit_code,
       vendor, version, description,
       system_owner_id, is_active, table_api_url, table_api_auth_type,
       table_api_config, column_api_url
     )
     OUTPUT INSERTED.*
     VALUES (
       @systemCode, @systemName, @systemType, @companyCode, @businessUnitCode,
       @vendor, @version, @description,
       @systemOwnerId, @isActive, @tableApiUrl, @tableApiAuthType,
       @tableApiConfig, @columnApiUrl
     )`,
    {
      ...systemParams(input),
      isActive: input.isActive === false ? 0 : 1,
    },
  );

  if (!row) {
    throw new Error("Failed to create system");
  }

  return mapSystem(row);
};

/** 시스템을 수정한다. */
export const updateSystem = async (
  systemId: number,
  input: Partial<UpsertApplicationSystemDto>,
): Promise<ApplicationSystem | null> => {
  const row = await queryOne<Record<string, unknown>>(
    `UPDATE application_system
     SET system_code = @systemCode,
         system_name = @systemName,
         system_type = @systemType,
         company_code = @companyCode,
         business_unit_code = @businessUnitCode,
         vendor = @vendor,
         version = @version,
         description = @description,
         system_owner_id = @systemOwnerId,
         is_active = @isActive,
         table_api_url = @tableApiUrl,
         table_api_auth_type = @tableApiAuthType,
         table_api_config = @tableApiConfig,
         column_api_url = @columnApiUrl,
         updated_at = GETDATE()
     OUTPUT INSERTED.*
     WHERE system_id = @systemId`,
    {
      systemId,
      ...systemParams(input),
      isActive: input.isActive === false ? 0 : 1,
    },
  );

  return row ? mapSystem(row) : null;
};

/** 시스템을 비활성화한다. */
export const deactivateSystem = async (systemId: number): Promise<void> => {
  await execute(
    `UPDATE application_system
     SET is_active = 0, updated_at = GETDATE()
     WHERE system_id = @systemId`,
    { systemId },
  );
};

/** 시스템 저장 파라미터를 구성한다. */
const systemParams = (
  input: Partial<UpsertApplicationSystemDto>,
): QueryParams => ({
  systemCode: input.systemCode,
  systemName: input.systemName,
  systemType: input.systemType,
  companyCode: input.companyCode ?? null,
  businessUnitCode: input.businessUnitCode ?? null,
  vendor: input.vendor ?? null,
  version: input.version ?? null,
  description: input.description ?? null,
  systemOwnerId: input.systemOwnerId ?? null,
  tableApiUrl: input.tableApiUrl ?? null,
  tableApiAuthType: input.tableApiAuthType ?? null,
  tableApiConfig: input.tableApiConfig
    ? JSON.stringify(input.tableApiConfig)
    : null,
  columnApiUrl: input.columnApiUrl ?? null,
});

/** 공통코드(MODULE_CD) 모듈 목록을 조회한다. */
export const listModuleOptions = async (
  locale: Locale = "ko",
  systemId?: number,
): Promise<SystemModuleOption[]> => {
  const params: QueryParams = { locale };
  let screenCountJoin = "";

  if (systemId) {
    params.systemId = systemId;
    screenCountJoin = `
      LEFT JOIN (
        SELECT module_code, COUNT(*) AS screen_count
        FROM system_screen
        WHERE system_id = @systemId AND is_active = 1
        GROUP BY module_code
      ) sc ON sc.module_code = cc.code`;
  }

  const rows = await query<Record<string, unknown>>(
    `SELECT
       cc.code AS module_code,
       COALESCE(cci.code_name, cc.code_name) AS module_name,
       sc.screen_count
     FROM common_code cc
     LEFT JOIN common_code_i18n cci
       ON cci.group_code = cc.group_code
      AND cci.code = cc.code
      AND cci.locale = @locale
     ${screenCountJoin}
     WHERE cc.group_code = 'MODULE_CD'
       AND cc.is_active = 1
     ORDER BY cc.sort_order, cc.code`,
    params,
  );

  return rows.map((row) => ({
    moduleCode: row.module_code as string,
    moduleName: row.module_name as string,
    screenCount: systemId ? (row.screen_count as number | null) ?? 0 : undefined,
  }));
};

/** 시스템별 화면 목록을 조회한다. */
export const listScreensBySystem = async (
  systemId: number,
  filters: SystemScreenListFilters = {},
  locale: Locale = "ko",
): Promise<SystemScreenDto[]> => {
  const conditions = ["sc.system_id = @systemId"];
  const params: QueryParams = { systemId, locale };

  if (filters.moduleCode) {
    conditions.push("sc.module_code = @moduleCode");
    params.moduleCode = filters.moduleCode;
  }
  if (filters.isActive !== undefined) {
    conditions.push("sc.is_active = @isActive");
    params.isActive = filters.isActive ? 1 : 0;
  }

  const rows = await query<Record<string, unknown>>(
    `SELECT
       sc.*,
       s.system_code,
       s.system_name,
       COALESCE(cci.code_name, cc.code_name, sc.module_code) AS module_name
     FROM system_screen sc
     INNER JOIN application_system s ON sc.system_id = s.system_id
     LEFT JOIN common_code cc
       ON cc.group_code = 'MODULE_CD'
      AND cc.code = sc.module_code
     LEFT JOIN common_code_i18n cci
       ON cci.group_code = cc.group_code
      AND cci.code = cc.code
      AND cci.locale = @locale
     WHERE ${conditions.join(" AND ")}
     ORDER BY sc.is_active DESC, sc.module_code, sc.menu_id`,
    params,
  );

  return rows.map(mapScreenDto);
};

export const findScreenById = async (
  screenId: number,
  locale: Locale = "ko",
): Promise<SystemScreenDto | null> => {
  const row = await queryOne<Record<string, unknown>>(
    `SELECT
       sc.*,
       s.system_code,
       s.system_name,
       COALESCE(cci.code_name, cc.code_name, sc.module_code) AS module_name
     FROM system_screen sc
     INNER JOIN application_system s ON sc.system_id = s.system_id
     LEFT JOIN common_code cc
       ON cc.group_code = 'MODULE_CD'
      AND cc.code = sc.module_code
     LEFT JOIN common_code_i18n cci
       ON cci.group_code = cc.group_code
      AND cci.code = cc.code
      AND cci.locale = @locale
     WHERE sc.screen_id = @screenId`,
    { screenId, locale },
  );

  return row ? mapScreenDto(row) : null;
};

export const existsScreenMenu = async (
  systemId: number,
  menuId: string,
  excludeScreenId?: number,
): Promise<boolean> => {
  const params: QueryParams = { systemId, menuId };
  let sql = `SELECT 1 AS found
             FROM system_screen
             WHERE system_id = @systemId AND menu_id = @menuId`;

  if (excludeScreenId) {
    sql += " AND screen_id <> @excludeScreenId";
    params.excludeScreenId = excludeScreenId;
  }

  return Boolean(await queryOne<Record<string, unknown>>(sql, params));
};

export const createScreen = async (
  input: UpsertSystemScreenDto,
): Promise<SystemScreen> => {
  const row = await queryOne<Record<string, unknown>>(
    `INSERT INTO system_screen (
       system_id, module_code, menu_id, screen_code, screen_name,
       transaction_code, menu_path, screen_type, url, description, is_active
     )
     OUTPUT INSERTED.*
     VALUES (
       @systemId, @moduleCode, @menuId, @screenCode, @screenName,
       @transactionCode, @menuPath, @screenType, @url, @description, @isActive
     )`,
    screenParams(input),
  );

  if (!row) {
    throw new Error("Failed to create screen");
  }

  return mapScreen(row);
};

export const updateScreen = async (
  screenId: number,
  input: UpsertSystemScreenDto,
): Promise<SystemScreen | null> => {
  const row = await queryOne<Record<string, unknown>>(
    `UPDATE system_screen
     SET system_id = @systemId,
         module_code = @moduleCode,
         menu_id = @menuId,
         screen_code = @screenCode,
         screen_name = @screenName,
         transaction_code = @transactionCode,
         menu_path = @menuPath,
         screen_type = @screenType,
         url = @url,
         description = @description,
         is_active = @isActive
     OUTPUT INSERTED.*
     WHERE screen_id = @screenId`,
    { screenId, ...screenParams(input) },
  );

  return row ? mapScreen(row) : null;
};

export const upsertScreen = async (
  input: UpsertSystemScreenDto,
): Promise<SystemScreen> => {
  const existing = await queryOne<Record<string, unknown>>(
    `SELECT screen_id
     FROM system_screen
     WHERE system_id = @systemId AND menu_id = @menuId`,
    { systemId: input.systemId, menuId: input.menuId },
  );

  if (existing?.screen_id) {
    const updated = await updateScreen(existing.screen_id as number, input);
    if (!updated) {
      throw new Error("Failed to update screen");
    }
    return updated;
  }

  return createScreen(input);
};

export const deactivateScreen = async (screenId: number): Promise<void> => {
  await execute(
    "UPDATE system_screen SET is_active = 0 WHERE screen_id = @screenId",
    { screenId },
  );
};

const screenParams = (input: UpsertSystemScreenDto): QueryParams => ({
  systemId: input.systemId,
  moduleCode: input.moduleCode,
  menuId: input.menuId,
  screenCode: input.screenCode ?? input.menuId,
  screenName: input.screenName,
  transactionCode: input.transactionCode ?? input.menuId,
  menuPath: input.menuPath ?? null,
  screenType: input.screenType ?? null,
  url: input.url ?? null,
  description: input.description ?? null,
  isActive: input.isActive === false ? 0 : 1,
});

/** 시스템-모듈-화면 전체 계층을 조회한다. */
export const listSystemHierarchy = async (
  locale: Locale = "ko",
): Promise<SystemHierarchyDto[]> => {
  const systems = await listSystems({ isActive: true }, locale);
  const result: SystemHierarchyDto[] = [];

  for (const system of systems) {
    const screens = (await listScreensBySystem(system.systemId, { isActive: true }, locale));
    const moduleMap = new Map<string, SystemScreenDto[]>();

    for (const screen of screens) {
      const bucket = moduleMap.get(screen.moduleCode) ?? [];
      bucket.push(screen);
      moduleMap.set(screen.moduleCode, bucket);
    }

    const moduleOptions = await listModuleOptions(locale, system.systemId);
    const moduleDtos: SystemHierarchyDto["modules"] = moduleOptions
      .filter((module) => moduleMap.has(module.moduleCode))
      .map((module) => ({
        ...module,
        screens: moduleMap.get(module.moduleCode) ?? [],
      }));

    result.push({ ...system, modules: moduleDtos });
  }

  return result;
};

/** Task-시스템 매핑 목록을 조회한다. */
export const listTaskSystemMappings = async (
  nodeId: number,
  locale: Locale = "ko",
): Promise<TaskSystemMappingDto[]> => {
  const rows = await query<Record<string, unknown>>(
    `SELECT
       tsm.*,
       sc.screen_code,
       sc.screen_name,
       sc.menu_id,
       sc.transaction_code,
       sc.menu_path,
       sc.screen_type,
       sc.module_code,
       s.system_id,
       s.system_code,
       s.system_name,
       s.company_code,
       s.business_unit_code,
       COALESCE(company_i18n.code_name, company_code_cc.code_name) AS company_name,
       COALESCE(bu_i18n.code_name, bu_code_cc.code_name) AS business_unit_name,
       COALESCE(cci.code_name, cc.code_name, sc.module_code) AS module_name
     FROM task_system_mapping tsm
     INNER JOIN system_screen sc ON tsm.screen_id = sc.screen_id
     INNER JOIN application_system s ON sc.system_id = s.system_id
     LEFT JOIN common_code cc
       ON cc.group_code = 'MODULE_CD'
      AND cc.code = sc.module_code
     LEFT JOIN common_code_i18n cci
       ON cci.group_code = cc.group_code
      AND cci.code = cc.code
      AND cci.locale = @locale
     LEFT JOIN common_code company_code_cc
       ON company_code_cc.group_code = 'COMPANY_CD'
      AND company_code_cc.code = s.company_code
     LEFT JOIN common_code_i18n company_i18n
       ON company_i18n.group_code = company_code_cc.group_code
      AND company_i18n.code = company_code_cc.code
      AND company_i18n.locale = @locale
     LEFT JOIN common_code bu_code_cc
       ON bu_code_cc.group_code = 'BU_CD'
      AND bu_code_cc.code = s.business_unit_code
     LEFT JOIN common_code_i18n bu_i18n
       ON bu_i18n.group_code = bu_code_cc.group_code
      AND bu_i18n.code = bu_code_cc.code
      AND bu_i18n.locale = @locale
     WHERE tsm.node_id = @nodeId
     ORDER BY tsm.is_primary DESC, s.system_code, sc.module_code, sc.menu_id`,
    { nodeId, locale },
  );

  return rows.map((row) => ({
    mappingId: row.mapping_id as number,
    nodeId: row.node_id as number,
    screenId: row.screen_id as number,
    usageType: row.usage_type as TaskSystemMappingDto["usageType"],
    usageDescription: (row.usage_description as string | null) ?? null,
    isPrimary: Boolean(row.is_primary),
    createdBy: (row.created_by as number | null) ?? null,
    createdAt: new Date(row.created_at as string),
    systemId: row.system_id as number,
    systemCode: row.system_code as string,
    systemName: row.system_name as string,
    companyCode: (row.company_code as string | null) ?? null,
    businessUnitCode: (row.business_unit_code as string | null) ?? null,
    companyName: (row.company_name as string | null) ?? null,
    businessUnitName: (row.business_unit_name as string | null) ?? null,
    moduleCode: row.module_code as string,
    moduleName: row.module_name as string,
    menuId: row.menu_id as string,
    screenCode: row.screen_code as string,
    screenName: row.screen_name as string,
    transactionCode: (row.transaction_code as string | null) ?? null,
    menuPath: (row.menu_path as string | null) ?? null,
    screenType: (row.screen_type as TaskSystemMappingDto["screenType"]) ?? null,
  }));
};

export const createTaskSystemMapping = async (
  input: CreateTaskSystemMappingDto,
  userId: number | null,
): Promise<TaskSystemMappingDto> => {
  if (input.isPrimary) {
    await execute(
      "UPDATE task_system_mapping SET is_primary = 0 WHERE node_id = @nodeId",
      { nodeId: input.nodeId },
    );
  }

  const row = await queryOne<Record<string, unknown>>(
    `INSERT INTO task_system_mapping (
       node_id, screen_id, usage_type, usage_description, is_primary, created_by
     )
     OUTPUT INSERTED.mapping_id
     VALUES (
       @nodeId, @screenId, @usageType, @usageDescription, @isPrimary, @createdBy
     )`,
    {
      nodeId: input.nodeId,
      screenId: input.screenId,
      usageType: input.usageType,
      usageDescription: input.usageDescription ?? null,
      isPrimary: input.isPrimary ? 1 : 0,
      createdBy: userId,
    },
  );

  const mappingId = row?.mapping_id as number | undefined;
  if (!mappingId) {
    throw new Error("Failed to create task-system mapping");
  }

  const created = (await listTaskSystemMappings(input.nodeId)).find(
    (mapping) => mapping.mappingId === mappingId,
  );
  if (!created) {
    throw new Error("Failed to load task-system mapping");
  }

  return created;
};

export const deleteTaskSystemMapping = async (
  nodeId: number,
  mappingId: number,
): Promise<void> => {
  await execute(
    `DELETE FROM task_system_mapping
     WHERE node_id = @nodeId AND mapping_id = @mappingId`,
    { nodeId, mappingId },
  );
};

/** 연결 후보 화면 카탈로그를 페이지 단위로 조회한다. */
export const listScreenCatalog = async (
  filters: ScreenCatalogFilters = {},
  locale: Locale = "ko",
): Promise<{ items: ScreenCatalogItem[]; total: number }> => {
  const conditions = ["sc.is_active = 1"];
  const params: QueryParams = { locale };
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(200, Math.max(1, filters.pageSize ?? 50));
  params.offset = (page - 1) * pageSize;
  params.pageSize = pageSize;

  if (filters.systemId) {
    conditions.push("sc.system_id = @systemId");
    params.systemId = filters.systemId;
  }
  if (filters.moduleCode) {
    conditions.push("sc.module_code = @moduleCode");
    params.moduleCode = filters.moduleCode;
  }
  if (filters.search?.trim()) {
    conditions.push(
      "(sc.screen_name LIKE @search OR sc.menu_id LIKE @search OR sc.menu_path LIKE @search OR sc.transaction_code LIKE @search)",
    );
    params.search = `%${filters.search.trim()}%`;
  }
  if (filters.excludeNodeId) {
    conditions.push(`sc.screen_id NOT IN (
      SELECT tsm.screen_id
      FROM task_system_mapping tsm
      WHERE tsm.node_id = @excludeNodeId
    )`);
    params.excludeNodeId = filters.excludeNodeId;
  }

  const whereClause = conditions.join(" AND ");

  const countRow = await queryOne<Record<string, unknown>>(
    `SELECT COUNT(*) AS total
     FROM system_screen sc
     INNER JOIN application_system s ON sc.system_id = s.system_id
     WHERE ${whereClause}`,
    params,
  );

  const rows = await query<Record<string, unknown>>(
    `SELECT
       sc.*,
       s.system_code,
       s.system_name,
       s.company_code,
       s.business_unit_code,
       COALESCE(company_i18n.code_name, company_code.code_name) AS company_name,
       COALESCE(bu_i18n.code_name, bu_code.code_name) AS business_unit_name,
       COALESCE(cci.code_name, cc.code_name, sc.module_code) AS module_name
     FROM system_screen sc
     INNER JOIN application_system s ON sc.system_id = s.system_id
     LEFT JOIN common_code company_code
       ON company_code.group_code = 'COMPANY_CD'
      AND company_code.code = s.company_code
     LEFT JOIN common_code_i18n company_i18n
       ON company_i18n.group_code = company_code.group_code
      AND company_i18n.code = company_code.code
      AND company_i18n.locale = @locale
     LEFT JOIN common_code bu_code
       ON bu_code.group_code = 'BU_CD'
      AND bu_code.code = s.business_unit_code
     LEFT JOIN common_code_i18n bu_i18n
       ON bu_i18n.group_code = bu_code.group_code
      AND bu_i18n.code = bu_code.code
      AND bu_i18n.locale = @locale
     LEFT JOIN common_code cc
       ON cc.group_code = 'MODULE_CD'
      AND cc.code = sc.module_code
     LEFT JOIN common_code_i18n cci
       ON cci.group_code = cc.group_code
      AND cci.code = cc.code
      AND cci.locale = @locale
     WHERE ${whereClause}
     ORDER BY s.system_code, s.company_code, s.business_unit_code, sc.module_code, sc.menu_id
     OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY`,
    params,
  );

  return {
    items: rows.map((row) => ({
      ...mapScreenDto(row),
      companyCode: (row.company_code as string | null) ?? null,
      businessUnitCode: (row.business_unit_code as string | null) ?? null,
      companyName: (row.company_name as string | null) ?? null,
      businessUnitName: (row.business_unit_name as string | null) ?? null,
    })),
    total: (countRow?.total as number) ?? 0,
  };
};

/** Task-시스템 매핑을 일괄 생성한다. */
export const createTaskSystemMappingsBatch = async (
  nodeId: number,
  input: BatchCreateTaskSystemMappingDto,
  userId: number | null,
): Promise<number> => {
  const uniqueScreenIds = [...new Set(input.screenIds.filter((id) => id > 0))];
  if (uniqueScreenIds.length === 0) {
    return 0;
  }

  if (input.isPrimary) {
    await execute(
      "UPDATE task_system_mapping SET is_primary = 0 WHERE node_id = @nodeId",
      { nodeId },
    );
  }

  let createdCount = 0;

  for (const screenId of uniqueScreenIds) {
    const exists = await queryOne<Record<string, unknown>>(
      `SELECT 1 AS found
       FROM task_system_mapping
       WHERE node_id = @nodeId AND screen_id = @screenId`,
      { nodeId, screenId },
    );

    if (exists) {
      continue;
    }

    await execute(
      `INSERT INTO task_system_mapping (
         node_id, screen_id, usage_type, usage_description, is_primary, created_by
       )
       VALUES (
         @nodeId, @screenId, @usageType, @usageDescription, @isPrimary, @createdBy
       )`,
      {
        nodeId,
        screenId,
        usageType: input.usageType ?? "EXECUTE",
        usageDescription: input.usageDescription ?? null,
        isPrimary: input.isPrimary && createdCount === 0 ? 1 : 0,
        createdBy: userId,
      },
    );
    createdCount += 1;
  }

  return createdCount;
};

/** 공통코드(MODULE_CD) 항목을 upsert한다. */
export const upsertModuleCode = async (
  moduleCode: string,
  moduleName?: string,
  sortOrder = 0,
): Promise<void> => {
  await execute(
    `IF NOT EXISTS (
       SELECT 1 FROM common_code
       WHERE group_code = 'MODULE_CD' AND code = @moduleCode
     )
     BEGIN
       INSERT INTO common_code (group_code, code, code_name, sort_order, is_active)
       VALUES ('MODULE_CD', @moduleCode, @moduleName, @sortOrder, 1);
     END`,
    {
      moduleCode,
      moduleName: moduleName ?? moduleCode,
      sortOrder,
    },
  );
};

export type { SystemModuleDto };
