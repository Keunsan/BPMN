import "server-only";

import type { Locale } from "@/lib/i18n/config";
import type {
  ApplicationSystem,
  ApplicationSystemDto,
  BatchCreateTaskSystemLinkDto,
  BatchCreateTaskSystemScreenLinkDto,
  CreateTaskSystemLinkDto,
  ScreenCatalogFilters,
  ScreenCatalogItem,
  SystemCatalogFilters,
  SystemCatalogItem,
  SystemHierarchyDto,
  SystemListFilters,
  SystemModuleDto,
  SystemModuleOption,
  SystemScreen,
  SystemScreenDto,
  SystemScreenListFilters,
  TaskSystemLinkDto,
  TaskSystemScreenLinkDto,
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
  screenId: toNumber(row.screen_id),
  systemId: toNumber(row.system_id),
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

/** Task-시스템 화면 연결 목록을 조회한다. */
const listTaskSystemScreenLinks = async (
  linkIds: number[],
  locale: Locale = "ko",
): Promise<Map<number, TaskSystemScreenLinkDto[]>> => {
  const result = new Map<number, TaskSystemScreenLinkDto[]>();
  if (linkIds.length === 0) {
    return result;
  }

  const placeholders = linkIds.map((_, index) => `@linkId${index}`).join(", ");
  const params: QueryParams = { locale };
  linkIds.forEach((linkId, index) => {
    params[`linkId${index}`] = linkId;
  });

  const rows = await query<Record<string, unknown>>(
    `SELECT
       tssl.*,
       sc.screen_code,
       sc.screen_name,
       sc.menu_id,
       sc.transaction_code,
       sc.menu_path,
       sc.screen_type,
       sc.module_code,
       COALESCE(cci.code_name, cc.code_name, sc.module_code) AS module_name
     FROM task_system_screen_link tssl
     INNER JOIN system_screen sc ON tssl.screen_id = sc.screen_id
     LEFT JOIN common_code cc
       ON cc.group_code = 'MODULE_CD'
      AND cc.code = sc.module_code
     LEFT JOIN common_code_i18n cci
       ON cci.group_code = cc.group_code
      AND cci.code = cc.code
      AND cci.locale = @locale
     WHERE tssl.link_id IN (${placeholders})
     ORDER BY sc.module_code, sc.menu_id`,
    params,
  );

  for (const row of rows) {
    const linkId = toNumber(row.link_id);
    const screens = result.get(linkId) ?? [];
    screens.push({
      screenLinkId: toNumber(row.screen_link_id),
      linkId,
      screenId: toNumber(row.screen_id),
      createdAt: new Date(row.created_at as string),
      moduleCode: row.module_code as string,
      moduleName: row.module_name as string,
      menuId: row.menu_id as string,
      screenCode: row.screen_code as string,
      screenName: row.screen_name as string,
      transactionCode: (row.transaction_code as string | null) ?? null,
      menuPath: (row.menu_path as string | null) ?? null,
      screenType: (row.screen_type as TaskSystemScreenLinkDto["screenType"]) ?? null,
    });
    result.set(linkId, screens);
  }

  return result;
};

/** Task-시스템 1차 연결 목록을 조회한다. */
export const listTaskSystemLinks = async (
  nodeId: number,
  locale: Locale = "ko",
): Promise<TaskSystemLinkDto[]> => {
  const rows = await query<Record<string, unknown>>(
    `SELECT
       tsl.*,
       s.system_code,
       s.system_name,
       s.company_code,
       s.business_unit_code,
       COALESCE(company_i18n.code_name, company_code_cc.code_name) AS company_name,
       COALESCE(bu_i18n.code_name, bu_code_cc.code_name) AS business_unit_name,
       (
         SELECT COUNT(*)
         FROM task_system_screen_link tssl
         WHERE tssl.link_id = tsl.link_id
       ) AS screen_count
     FROM task_system_link tsl
     INNER JOIN application_system s ON tsl.system_id = s.system_id
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
     WHERE tsl.node_id = @nodeId
     ORDER BY tsl.is_primary DESC, s.system_code`,
    { nodeId, locale },
  );

  const linkIds = rows.map((row) => toNumber(row.link_id));
  const screensByLink = await listTaskSystemScreenLinks(linkIds, locale);

  return rows.map((row) => {
    const linkId = toNumber(row.link_id);
    const screens = screensByLink.get(linkId) ?? [];
    return {
      linkId,
      nodeId: toNumber(row.node_id),
      systemId: toNumber(row.system_id),
      usageDescription: (row.usage_description as string | null) ?? null,
      isPrimary: Boolean(row.is_primary),
      createdBy: toNullableNumber(row.created_by),
      createdAt: new Date(row.created_at as string),
      systemCode: row.system_code as string,
      systemName: row.system_name as string,
      companyCode: (row.company_code as string | null) ?? null,
      businessUnitCode: (row.business_unit_code as string | null) ?? null,
      companyName: (row.company_name as string | null) ?? null,
      businessUnitName: (row.business_unit_name as string | null) ?? null,
      screenCount: Number(row.screen_count ?? screens.length),
      screens,
    };
  });
};

/** link_id(및 선택적 node_id)로 시스템 ID를 조회한다. */
export const findTaskSystemLinkSystemId = async (
  linkId: number,
  nodeId?: number,
): Promise<number | null> => {
  const row = await queryOne<Record<string, unknown>>(
    nodeId
      ? `SELECT system_id FROM task_system_link WHERE link_id = @linkId AND node_id = @nodeId`
      : `SELECT system_id FROM task_system_link WHERE link_id = @linkId`,
    nodeId ? { linkId, nodeId } : { linkId },
  );
  return row ? toNumber(row.system_id) : null;
};

/** Task-시스템 링크와 시스템이 일치하지 않는 화면 ID를 반환한다. */
export const findScreenIdsOutsideTaskSystemLink = async (
  nodeId: number,
  linkId: number,
  screenIds: number[],
): Promise<number[]> => {
  const uniqueScreenIds = [...new Set(screenIds.filter((id) => id > 0))];
  if (uniqueScreenIds.length === 0) {
    return [];
  }

  const placeholders = uniqueScreenIds.map((_, index) => `@screenId${index}`).join(", ");
  const params: QueryParams = { nodeId, linkId };
  uniqueScreenIds.forEach((screenId, index) => {
    params[`screenId${index}`] = screenId;
  });

  const rows = await query<Record<string, unknown>>(
    `SELECT sc.screen_id
     FROM system_screen sc
     WHERE sc.screen_id IN (${placeholders})
       AND NOT EXISTS (
         SELECT 1
         FROM task_system_link tsl
         WHERE tsl.link_id = @linkId
           AND tsl.node_id = @nodeId
           AND tsl.system_id = sc.system_id
       )`,
    params,
  );

  return rows.map((row) => toNumber(row.screen_id));
};

/** Task-시스템 1차 연결을 조회한다. */
export const findTaskSystemLinkById = async (
  nodeId: number,
  linkId: number,
  locale: Locale = "ko",
): Promise<TaskSystemLinkDto | null> => {
  const row = await queryOne<Record<string, unknown>>(
    `SELECT
       tsl.*,
       s.system_code,
       s.system_name,
       s.company_code,
       s.business_unit_code,
       COALESCE(company_i18n.code_name, company_code_cc.code_name) AS company_name,
       COALESCE(bu_i18n.code_name, bu_code_cc.code_name) AS business_unit_name,
       (
         SELECT COUNT(*)
         FROM task_system_screen_link tssl
         WHERE tssl.link_id = tsl.link_id
       ) AS screen_count
     FROM task_system_link tsl
     INNER JOIN application_system s ON tsl.system_id = s.system_id
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
     WHERE tsl.node_id = @nodeId AND tsl.link_id = @linkId`,
    { nodeId, linkId, locale },
  );

  if (!row) {
    return null;
  }

  const normalizedLinkId = toNumber(row.link_id);
  const screensByLink = await listTaskSystemScreenLinks([normalizedLinkId], locale);
  const screens = screensByLink.get(normalizedLinkId) ?? [];

  return {
    linkId: normalizedLinkId,
    nodeId: toNumber(row.node_id),
    systemId: toNumber(row.system_id),
    usageDescription: (row.usage_description as string | null) ?? null,
    isPrimary: Boolean(row.is_primary),
    createdBy: toNullableNumber(row.created_by),
    createdAt: new Date(row.created_at as string),
    systemCode: row.system_code as string,
    systemName: row.system_name as string,
    companyCode: (row.company_code as string | null) ?? null,
    businessUnitCode: (row.business_unit_code as string | null) ?? null,
    companyName: (row.company_name as string | null) ?? null,
    businessUnitName: (row.business_unit_name as string | null) ?? null,
    screenCount: Number(row.screen_count ?? screens.length),
    screens,
  };
};

const clearTaskSystemLinkPrimary = async (nodeId: number): Promise<void> => {
  await execute(
    "UPDATE task_system_link SET is_primary = 0 WHERE node_id = @nodeId",
    { nodeId },
  );
};

/** Task-시스템 1차 연결을 생성한다. */
export const createTaskSystemLink = async (
  input: CreateTaskSystemLinkDto,
  userId: number | null,
): Promise<TaskSystemLinkDto> => {
  if (input.isPrimary) {
    await clearTaskSystemLinkPrimary(input.nodeId);
  }

  const row = await queryOne<Record<string, unknown>>(
    `INSERT INTO task_system_link (
       node_id, system_id, usage_description, is_primary, created_by
     )
     OUTPUT INSERTED.link_id
     VALUES (
       @nodeId, @systemId, @usageDescription, @isPrimary, @createdBy
     )`,
    {
      nodeId: input.nodeId,
      systemId: input.systemId,
      usageDescription: input.usageDescription ?? null,
      isPrimary: input.isPrimary ? 1 : 0,
      createdBy: userId,
    },
  );

  const linkId = row?.link_id ? toNumber(row.link_id) : undefined;
  if (!linkId) {
    throw new Error("Failed to create task-system link");
  }

  const created = await findTaskSystemLinkById(input.nodeId, linkId);
  if (!created) {
    throw new Error("Failed to load task-system link");
  }

  return created;
};

/** Task-시스템 1차 연결을 삭제한다. */
export const deleteTaskSystemLink = async (
  nodeId: number,
  linkId: number,
): Promise<void> => {
  await execute(
    `DELETE FROM task_system_link
     WHERE node_id = @nodeId AND link_id = @linkId`,
    { nodeId, linkId },
  );
};

/** Task-시스템 1차 연결의 주요 시스템을 지정한다. */
export const setTaskSystemLinkPrimary = async (
  nodeId: number,
  linkId: number,
): Promise<void> => {
  await clearTaskSystemLinkPrimary(nodeId);
  await execute(
    `UPDATE task_system_link
     SET is_primary = 1
     WHERE node_id = @nodeId AND link_id = @linkId`,
    { nodeId, linkId },
  );
};

/** Task-시스템 1차 연결을 일괄 생성한다. */
export const createTaskSystemLinksBatch = async (
  nodeId: number,
  input: BatchCreateTaskSystemLinkDto,
  userId: number | null,
): Promise<number> => {
  const uniqueSystemIds = [...new Set(input.systemIds.filter((id) => id > 0))];
  if (uniqueSystemIds.length === 0) {
    return 0;
  }

  if (input.isPrimary) {
    await clearTaskSystemLinkPrimary(nodeId);
  }

  let createdCount = 0;

  for (const systemId of uniqueSystemIds) {
    const exists = await queryOne<Record<string, unknown>>(
      `SELECT 1 AS found
       FROM task_system_link
       WHERE node_id = @nodeId AND system_id = @systemId`,
      { nodeId, systemId },
    );

    if (exists) {
      continue;
    }

    await execute(
      `INSERT INTO task_system_link (
         node_id, system_id, usage_description, is_primary, created_by
       )
       VALUES (
         @nodeId, @systemId, NULL, @isPrimary, @createdBy
       )`,
      {
        nodeId,
        systemId,
        isPrimary: input.isPrimary && createdCount === 0 ? 1 : 0,
        createdBy: userId,
      },
    );
    createdCount += 1;
  }

  return createdCount;
};

/** Task-시스템 2차 화면 연결을 일괄 생성한다. */
export const createTaskSystemScreenLinksBatch = async (
  linkId: number,
  input: BatchCreateTaskSystemScreenLinkDto,
): Promise<number> => {
  const uniqueScreenIds = [...new Set(input.screenIds.filter((id) => id > 0))];
  if (uniqueScreenIds.length === 0) {
    return 0;
  }

  let createdCount = 0;

  for (const screenId of uniqueScreenIds) {
    const exists = await queryOne<Record<string, unknown>>(
      `SELECT 1 AS found
       FROM task_system_screen_link
       WHERE link_id = @linkId AND screen_id = @screenId`,
      { linkId, screenId },
    );

    if (exists) {
      continue;
    }

    await execute(
      `INSERT INTO task_system_screen_link (link_id, screen_id)
       VALUES (@linkId, @screenId)`,
      { linkId, screenId },
    );
    createdCount += 1;
  }

  return createdCount;
};

/** Task-시스템 2차 화면 연결을 삭제한다. */
export const deleteTaskSystemScreenLink = async (
  linkId: number,
  screenLinkId: number,
): Promise<void> => {
  await execute(
    `DELETE FROM task_system_screen_link
     WHERE link_id = @linkId AND screen_link_id = @screenLinkId`,
    { linkId, screenLinkId },
  );
};

/** 연결 후보 시스템 카탈로그를 페이지 단위로 조회한다. */
export const listSystemCatalog = async (
  filters: SystemCatalogFilters = {},
  locale: Locale = "ko",
): Promise<{ items: SystemCatalogItem[]; total: number }> => {
  const conditions = ["s.is_active = 1"];
  const params: QueryParams = { locale };
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(200, Math.max(1, filters.pageSize ?? 50));
  params.offset = (page - 1) * pageSize;
  params.pageSize = pageSize;

  if (filters.search?.trim()) {
    conditions.push(
      "(s.system_name LIKE @search OR s.system_code LIKE @search)",
    );
    params.search = `%${filters.search.trim()}%`;
  }
  if (filters.companyCode) {
    conditions.push("s.company_code = @companyCode");
    params.companyCode = filters.companyCode;
  }
  if (filters.businessUnitCode) {
    conditions.push("s.business_unit_code = @businessUnitCode");
    params.businessUnitCode = filters.businessUnitCode;
  }
  if (filters.excludeNodeId) {
    conditions.push(`s.system_id NOT IN (
      SELECT tsl.system_id
      FROM task_system_link tsl
      WHERE tsl.node_id = @excludeNodeId
    )`);
    params.excludeNodeId = filters.excludeNodeId;
  }

  const whereClause = conditions.join(" AND ");

  const countRow = await queryOne<Record<string, unknown>>(
    `SELECT COUNT(*) AS total
     FROM application_system s
     WHERE ${whereClause}`,
    params,
  );

  const rows = await query<Record<string, unknown>>(
    `SELECT
       s.*,
       COALESCE(company_i18n.code_name, company_code.code_name) AS company_name,
       COALESCE(bu_i18n.code_name, bu_code.code_name) AS business_unit_name,
       (
         SELECT COUNT(*)
         FROM system_screen sc
         WHERE sc.system_id = s.system_id AND sc.is_active = 1
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
     WHERE ${whereClause}
     ORDER BY s.system_code, s.company_code, s.business_unit_code
     OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY`,
    params,
  );

  return {
    items: rows.map((row) => ({
      ...mapSystem(row),
      companyName: (row.company_name as string | null) ?? null,
      businessUnitName: (row.business_unit_name as string | null) ?? null,
      screenCount: Number(row.screen_count ?? 0),
    })),
    total: (countRow?.total as number) ?? 0,
  };
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
  if (filters.excludeLinkId) {
    conditions.push(`sc.screen_id NOT IN (
      SELECT tssl.screen_id
      FROM task_system_screen_link tssl
      WHERE tssl.link_id = @excludeLinkId
    )`);
    params.excludeLinkId = filters.excludeLinkId;
  } else if (filters.excludeNodeId) {
    conditions.push(`sc.screen_id NOT IN (
      SELECT tssl.screen_id
      FROM task_system_screen_link tssl
      INNER JOIN task_system_link tsl ON tsl.link_id = tssl.link_id
      WHERE tsl.node_id = @excludeNodeId
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
