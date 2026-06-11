import "server-only";

import type {
  ExternalApiGlobalConfig,
  ExternalApiParamProfile,
  ExternalApiParamProfileDto,
  UpsertExternalApiGlobalConfigDto,
  UpsertExternalApiParamProfileDto,
} from "@/types/external-api";

import { execute, query, queryOne, type QueryParams } from "../pool";

/** JSON 설정 문자열을 안전하게 객체로 변환한다. */
const parseJson = (value: unknown): Record<string, unknown> | null => {
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

const stringifyJson = (value: Record<string, unknown> | null | undefined): string | null =>
  value ? JSON.stringify(value) : null;

const mapGlobalConfig = (row: Record<string, unknown>): ExternalApiGlobalConfig => ({
  configId: row.config_id as number,
  tableListApiUrl: (row.table_list_api_url as string | null) ?? null,
  tableSchemaApiUrl: (row.table_schema_api_url as string | null) ?? null,
  authType:
    (row.auth_type as ExternalApiGlobalConfig["authType"]) ?? "NONE",
  authConfig: parseJson(row.auth_config_json),
  updatedAt: row.updated_at ? new Date(row.updated_at as string) : null,
});

const mapProfile = (row: Record<string, unknown>): ExternalApiParamProfile => ({
  profileId: row.profile_id as number,
  systemId: row.system_id as number,
  tableListParams: parseJson(row.table_list_params_json),
  headerOverrides: parseJson(row.header_overrides_json),
  isActive: Boolean(row.is_active),
  createdAt: new Date(row.created_at as string),
  updatedAt: row.updated_at ? new Date(row.updated_at as string) : null,
});

const mapProfileDto = (row: Record<string, unknown>): ExternalApiParamProfileDto => ({
  ...mapProfile(row),
  systemCode: (row.system_code as string | undefined) ?? undefined,
  systemName: (row.system_name as string | undefined) ?? undefined,
});

/** 외부 API 공통 설정을 조회한다. */
export const getExternalApiGlobalConfig =
  async (): Promise<ExternalApiGlobalConfig | null> => {
    const row = await queryOne<Record<string, unknown>>(
      `SELECT TOP 1 *
       FROM external_api_global_config
       ORDER BY config_id`,
    );

    return row ? mapGlobalConfig(row) : null;
  };

/** 외부 API 공통 설정을 저장한다. */
export const upsertExternalApiGlobalConfig = async (
  input: UpsertExternalApiGlobalConfigDto,
): Promise<ExternalApiGlobalConfig> => {
  const existing = await getExternalApiGlobalConfig();
  const params: QueryParams = {
    tableListApiUrl: input.tableListApiUrl?.trim() || null,
    tableSchemaApiUrl: input.tableSchemaApiUrl?.trim() || null,
    authType: input.authType ?? "NONE",
    authConfigJson: stringifyJson(input.authConfig ?? null),
  };

  if (existing) {
    await execute(
      `UPDATE external_api_global_config
       SET table_list_api_url = @tableListApiUrl,
           table_schema_api_url = @tableSchemaApiUrl,
           auth_type = @authType,
           auth_config_json = @authConfigJson,
           updated_at = GETDATE()
       WHERE config_id = @configId`,
      { ...params, configId: existing.configId },
    );
  } else {
    await execute(
      `INSERT INTO external_api_global_config (
         table_list_api_url, table_schema_api_url, auth_type, auth_config_json, updated_at
       )
       VALUES (
         @tableListApiUrl, @tableSchemaApiUrl, @authType, @authConfigJson, GETDATE()
       )`,
      params,
    );
  }

  const updated = await getExternalApiGlobalConfig();
  if (!updated) {
    throw new Error("Failed to load external API global config");
  }

  return updated;
};

/** 시스템별 파라미터 프로파일 목록을 조회한다. */
export const listExternalApiParamProfiles = async (): Promise<
  ExternalApiParamProfileDto[]
> => {
  const rows = await query<Record<string, unknown>>(
    `SELECT p.*, s.system_code, s.system_name
     FROM external_api_param_profile p
     INNER JOIN application_system s ON s.system_id = p.system_id
     WHERE p.is_active = 1
     ORDER BY s.system_name`,
  );

  return rows.map(mapProfileDto);
};

/** 시스템별 파라미터 프로파일을 조회한다. */
export const findExternalApiParamProfileBySystemId = async (
  systemId: number,
): Promise<ExternalApiParamProfile | null> => {
  const row = await queryOne<Record<string, unknown>>(
    `SELECT *
     FROM external_api_param_profile
     WHERE system_id = @systemId`,
    { systemId },
  );

  return row ? mapProfile(row) : null;
};

/** 시스템별 파라미터 프로파일을 저장한다. */
export const upsertExternalApiParamProfile = async (
  input: UpsertExternalApiParamProfileDto,
): Promise<ExternalApiParamProfile> => {
  const existing = await findExternalApiParamProfileBySystemId(input.systemId);
  const params: QueryParams = {
    systemId: input.systemId,
    tableListParamsJson: stringifyJson(input.tableListParams ?? null),
    headerOverridesJson: stringifyJson(input.headerOverrides ?? null),
    isActive: input.isActive ?? true,
  };

  if (existing) {
    await execute(
      `UPDATE external_api_param_profile
       SET table_list_params_json = @tableListParamsJson,
           header_overrides_json = @headerOverridesJson,
           is_active = @isActive,
           updated_at = GETDATE()
       WHERE profile_id = @profileId`,
      { ...params, profileId: existing.profileId },
    );
  } else {
    await execute(
      `INSERT INTO external_api_param_profile (
         system_id, table_list_params_json, header_overrides_json, is_active
       )
       VALUES (
         @systemId, @tableListParamsJson, @headerOverridesJson, @isActive
       )`,
      params,
    );
  }

  const updated = await findExternalApiParamProfileBySystemId(input.systemId);
  if (!updated) {
    throw new Error("Failed to load external API param profile");
  }

  return updated;
};
