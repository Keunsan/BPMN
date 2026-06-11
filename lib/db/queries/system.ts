import "server-only";

import type {
  ApplicationSystem,
  ApplicationSystemDto,
  CreateTaskSystemMappingDto,
  SystemHierarchyDto,
  SystemListFilters,
  SystemModule,
  SystemModuleDto,
  SystemScreen,
  SystemScreenDto,
  TaskSystemMappingDto,
  UpsertApplicationSystemDto,
  UpsertSystemModuleDto,
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

/** application_system 행을 도메인 타입으로 변환한다. */
const mapSystem = (row: Record<string, unknown>): ApplicationSystem => ({
  systemId: row.system_id as number,
  systemCode: row.system_code as string,
  systemName: row.system_name as string,
  systemType: row.system_type as ApplicationSystem["systemType"],
  vendor: (row.vendor as string | null) ?? null,
  version: (row.version as string | null) ?? null,
  description: (row.description as string | null) ?? null,
  systemOwnerId: (row.system_owner_id as number | null) ?? null,
  isActive: Boolean(row.is_active),
  tableApiUrl: (row.table_api_url as string | null) ?? null,
  tableApiAuthType:
    (row.table_api_auth_type as ApplicationSystem["tableApiAuthType"]) ?? null,
  tableApiConfig: parseJsonConfig(row.table_api_config),
  columnApiUrl: (row.column_api_url as string | null) ?? null,
  createdAt: new Date(row.created_at as string),
  updatedAt: row.updated_at ? new Date(row.updated_at as string) : null,
});

/** system_module 행을 도메인 타입으로 변환한다. */
const mapModule = (row: Record<string, unknown>): SystemModule => ({
  moduleId: row.module_id as number,
  systemId: row.system_id as number,
  moduleCode: row.module_code as string,
  moduleName: row.module_name as string,
  description: (row.description as string | null) ?? null,
  isActive: Boolean(row.is_active),
  createdAt: new Date(row.created_at as string),
});

/** system_screen 행을 도메인 타입으로 변환한다. */
const mapScreen = (row: Record<string, unknown>): SystemScreen => ({
  screenId: row.screen_id as number,
  moduleId: row.module_id as number,
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

/** 시스템 목록을 조회한다. */
export const listSystems = async (
  filters: SystemListFilters = {},
): Promise<ApplicationSystemDto[]> => {
  const conditions = ["1=1"];
  const params: QueryParams = {};

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
  if (filters.isActive !== undefined) {
    conditions.push("s.is_active = @isActive");
    params.isActive = filters.isActive ? 1 : 0;
  }

  const rows = await query<Record<string, unknown>>(
    `SELECT
       s.*,
       (SELECT COUNT(*) FROM system_module m WHERE m.system_id = s.system_id) AS module_count,
       (
         SELECT COUNT(*)
         FROM system_screen sc
         INNER JOIN system_module m ON sc.module_id = m.module_id
         WHERE m.system_id = s.system_id
       ) AS screen_count
     FROM application_system s
     WHERE ${conditions.join(" AND ")}
     ORDER BY s.is_active DESC, s.system_code`,
    params,
  );

  return rows.map((row) => ({
    ...mapSystem(row),
    moduleCount: row.module_count as number,
    screenCount: row.screen_count as number,
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

/** 시스템 코드 중복 여부를 확인한다. */
export const existsSystemCode = async (
  systemCode: string,
  excludeSystemId?: number,
): Promise<boolean> => {
  const params: QueryParams = { systemCode };
  let sql =
    "SELECT 1 AS found FROM application_system WHERE system_code = @systemCode";

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
       system_code, system_name, system_type, vendor, version, description,
       system_owner_id, is_active, table_api_url, table_api_auth_type,
       table_api_config, column_api_url
     )
     OUTPUT INSERTED.*
     VALUES (
       @systemCode, @systemName, @systemType, @vendor, @version, @description,
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

/** 시스템 하위 모듈 목록을 조회한다. */
export const listModules = async (systemId: number): Promise<SystemModuleDto[]> => {
  const rows = await query<Record<string, unknown>>(
    `SELECT
       m.*,
       (SELECT COUNT(*) FROM system_screen s WHERE s.module_id = m.module_id) AS screen_count
     FROM system_module m
     WHERE m.system_id = @systemId
     ORDER BY m.is_active DESC, m.module_code`,
    { systemId },
  );

  return rows.map((row) => ({
    ...mapModule(row),
    screenCount: row.screen_count as number,
  }));
};

export const findModuleById = async (
  moduleId: number,
): Promise<SystemModule | null> => {
  const row = await queryOne<Record<string, unknown>>(
    "SELECT * FROM system_module WHERE module_id = @moduleId",
    { moduleId },
  );

  return row ? mapModule(row) : null;
};

export const existsModuleCode = async (
  systemId: number,
  moduleCode: string,
  excludeModuleId?: number,
): Promise<boolean> => {
  const params: QueryParams = { systemId, moduleCode };
  let sql = `SELECT 1 AS found
             FROM system_module
             WHERE system_id = @systemId AND module_code = @moduleCode`;

  if (excludeModuleId) {
    sql += " AND module_id <> @excludeModuleId";
    params.excludeModuleId = excludeModuleId;
  }

  return Boolean(await queryOne<Record<string, unknown>>(sql, params));
};

export const createModule = async (
  input: UpsertSystemModuleDto,
): Promise<SystemModule> => {
  const row = await queryOne<Record<string, unknown>>(
    `INSERT INTO system_module (
       system_id, module_code, module_name, description, is_active
     )
     OUTPUT INSERTED.*
     VALUES (
       @systemId, @moduleCode, @moduleName, @description, @isActive
     )`,
    moduleParams(input),
  );

  if (!row) {
    throw new Error("Failed to create module");
  }

  return mapModule(row);
};

export const updateModule = async (
  moduleId: number,
  input: UpsertSystemModuleDto,
): Promise<SystemModule | null> => {
  const row = await queryOne<Record<string, unknown>>(
    `UPDATE system_module
     SET system_id = @systemId,
         module_code = @moduleCode,
         module_name = @moduleName,
         description = @description,
         is_active = @isActive
     OUTPUT INSERTED.*
     WHERE module_id = @moduleId`,
    { moduleId, ...moduleParams(input) },
  );

  return row ? mapModule(row) : null;
};

export const deactivateModule = async (moduleId: number): Promise<void> => {
  await execute(
    "UPDATE system_module SET is_active = 0 WHERE module_id = @moduleId",
    { moduleId },
  );
};

const moduleParams = (input: UpsertSystemModuleDto): QueryParams => ({
  systemId: input.systemId,
  moduleCode: input.moduleCode,
  moduleName: input.moduleName,
  description: input.description ?? null,
  isActive: input.isActive === false ? 0 : 1,
});

/** 모듈 하위 화면 목록을 조회한다. */
export const listScreens = async (moduleId: number): Promise<SystemScreenDto[]> => {
  const rows = await query<Record<string, unknown>>(
    `SELECT
       sc.*,
       m.system_id,
       m.module_code,
       m.module_name,
       s.system_code,
       s.system_name
     FROM system_screen sc
     INNER JOIN system_module m ON sc.module_id = m.module_id
     INNER JOIN application_system s ON m.system_id = s.system_id
     WHERE sc.module_id = @moduleId
     ORDER BY sc.is_active DESC, sc.screen_code`,
    { moduleId },
  );

  return rows.map((row) => ({
    ...mapScreen(row),
    systemId: row.system_id as number,
    systemCode: row.system_code as string,
    systemName: row.system_name as string,
    moduleCode: row.module_code as string,
    moduleName: row.module_name as string,
  }));
};

export const findScreenById = async (
  screenId: number,
): Promise<SystemScreenDto | null> => {
  const row = await queryOne<Record<string, unknown>>(
    `SELECT
       sc.*,
       m.system_id,
       m.module_code,
       m.module_name,
       s.system_code,
       s.system_name
     FROM system_screen sc
     INNER JOIN system_module m ON sc.module_id = m.module_id
     INNER JOIN application_system s ON m.system_id = s.system_id
     WHERE sc.screen_id = @screenId`,
    { screenId },
  );

  return row
    ? {
        ...mapScreen(row),
        systemId: row.system_id as number,
        systemCode: row.system_code as string,
        systemName: row.system_name as string,
        moduleCode: row.module_code as string,
        moduleName: row.module_name as string,
      }
    : null;
};

export const existsScreenCode = async (
  moduleId: number,
  screenCode: string,
  excludeScreenId?: number,
): Promise<boolean> => {
  const params: QueryParams = { moduleId, screenCode };
  let sql = `SELECT 1 AS found
             FROM system_screen
             WHERE module_id = @moduleId AND screen_code = @screenCode`;

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
       module_id, screen_code, screen_name, transaction_code, menu_path,
       screen_type, url, description, is_active
     )
     OUTPUT INSERTED.*
     VALUES (
       @moduleId, @screenCode, @screenName, @transactionCode, @menuPath,
       @screenType, @url, @description, @isActive
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
     SET module_id = @moduleId,
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

export const deactivateScreen = async (screenId: number): Promise<void> => {
  await execute(
    "UPDATE system_screen SET is_active = 0 WHERE screen_id = @screenId",
    { screenId },
  );
};

const screenParams = (input: UpsertSystemScreenDto): QueryParams => ({
  moduleId: input.moduleId,
  screenCode: input.screenCode,
  screenName: input.screenName,
  transactionCode: input.transactionCode ?? null,
  menuPath: input.menuPath ?? null,
  screenType: input.screenType ?? null,
  url: input.url ?? null,
  description: input.description ?? null,
  isActive: input.isActive === false ? 0 : 1,
});

/** 시스템-모듈-화면 전체 계층을 조회한다. */
export const listSystemHierarchy = async (): Promise<SystemHierarchyDto[]> => {
  const systems = await listSystems({ isActive: true });
  const result: SystemHierarchyDto[] = [];

  for (const system of systems) {
    const modules = await listModules(system.systemId);
    const moduleDtos: SystemHierarchyDto["modules"] = [];

    for (const systemModule of modules.filter((item) => item.isActive)) {
      const screens = (await listScreens(systemModule.moduleId)).filter(
        (screen) => screen.isActive,
      );
      moduleDtos.push({ ...systemModule, screens });
    }

    result.push({ ...system, modules: moduleDtos });
  }

  return result;
};

/** Task-시스템 매핑 목록을 조회한다. */
export const listTaskSystemMappings = async (
  nodeId: number,
): Promise<TaskSystemMappingDto[]> => {
  const rows = await query<Record<string, unknown>>(
    `SELECT
       tsm.*,
       sc.screen_code,
       sc.screen_name,
       sc.transaction_code,
       sc.menu_path,
       sc.screen_type,
       m.module_id,
       m.module_code,
       m.module_name,
       s.system_id,
       s.system_code,
       s.system_name
     FROM task_system_mapping tsm
     INNER JOIN system_screen sc ON tsm.screen_id = sc.screen_id
     INNER JOIN system_module m ON sc.module_id = m.module_id
     INNER JOIN application_system s ON m.system_id = s.system_id
     WHERE tsm.node_id = @nodeId
     ORDER BY tsm.is_primary DESC, s.system_code, m.module_code, sc.screen_code`,
    { nodeId },
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
    moduleId: row.module_id as number,
    moduleCode: row.module_code as string,
    moduleName: row.module_name as string,
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
