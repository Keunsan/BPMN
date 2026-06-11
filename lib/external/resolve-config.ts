import "server-only";

import * as externalApiQueries from "@/lib/db/queries/external-api-config";
import * as systemQueries from "@/lib/db/queries/system";
import type { ApiAuthType } from "@/types/system";

export type ResolvedExternalCallConfig = {
  systemId: number;
  systemCode: string;
  tableApiUrl: string | null;
  columnApiUrl: string | null;
  tableApiAuthType: ApiAuthType | null;
  tableApiConfig: Record<string, unknown> | null;
  profileQueryParams: Record<string, string>;
};

const toQueryParams = (
  value: Record<string, unknown> | null | undefined,
): Record<string, string> => {
  if (!value) return {};

  const params: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (
      typeof entry === "string" ||
      typeof entry === "number" ||
      typeof entry === "boolean"
    ) {
      params[key] = String(entry);
    }
  }

  return params;
};

const mergeAuthConfig = (
  authConfig: Record<string, unknown> | null,
  headerOverrides: Record<string, unknown> | null,
): Record<string, unknown> | null => {
  if (!authConfig && !headerOverrides) {
    return null;
  }

  const base = { ...(authConfig ?? {}) };
  const existingHeaders =
    (base.headers as Record<string, unknown> | undefined) ??
    (base.headerParams as Record<string, unknown> | undefined) ??
    {};

  if (headerOverrides && Object.keys(headerOverrides).length > 0) {
    base.headers = { ...existingHeaders, ...headerOverrides };
  } else if (Object.keys(existingHeaders).length > 0) {
    base.headers = existingHeaders;
  }

  return base;
};

/** 테이블 목록 조회용 외부 API 설정을 병합한다. */
export const resolveTableListConfig = async (
  systemId: number,
): Promise<ResolvedExternalCallConfig | null> => {
  const [globalConfig, profile, system] = await Promise.all([
    externalApiQueries.getExternalApiGlobalConfig(),
    externalApiQueries.findExternalApiParamProfileBySystemId(systemId),
    systemQueries.findSystemById(systemId),
  ]);

  if (!system) {
    return null;
  }

  const globalUrl = globalConfig?.tableListApiUrl ?? null;
  const legacyUrl = system.tableApiUrl;
  const tableApiUrl = globalUrl || legacyUrl;

  if (!tableApiUrl) {
    return null;
  }

  const useGlobal = Boolean(globalUrl);
  const tableApiAuthType = useGlobal
    ? (globalConfig?.authType ?? "NONE")
    : (system.tableApiAuthType ?? "NONE");
  const tableApiConfig = useGlobal
    ? mergeAuthConfig(globalConfig?.authConfig ?? null, profile?.headerOverrides ?? null)
    : mergeAuthConfig(system.tableApiConfig, profile?.headerOverrides ?? null);

  return {
    systemId: system.systemId,
    systemCode: system.systemCode,
    tableApiUrl,
    columnApiUrl: null,
    tableApiAuthType,
    tableApiConfig,
    profileQueryParams: toQueryParams(profile?.tableListParams),
  };
};

/** 테이블 스키마(컬럼) 조회용 외부 API 설정을 병합한다. */
export const resolveTableSchemaConfig = async (
  systemId: number,
): Promise<ResolvedExternalCallConfig | null> => {
  const [globalConfig, profile, system] = await Promise.all([
    externalApiQueries.getExternalApiGlobalConfig(),
    externalApiQueries.findExternalApiParamProfileBySystemId(systemId),
    systemQueries.findSystemById(systemId),
  ]);

  if (!system) {
    return null;
  }

  const globalUrl = globalConfig?.tableSchemaApiUrl ?? null;
  const legacyUrl = system.columnApiUrl || system.tableApiUrl;
  const columnApiUrl = globalUrl || legacyUrl;

  if (!columnApiUrl) {
    return null;
  }

  const useGlobal = Boolean(globalUrl);
  const tableApiAuthType = useGlobal
    ? (globalConfig?.authType ?? "NONE")
    : (system.tableApiAuthType ?? "NONE");
  const tableApiConfig = useGlobal
    ? mergeAuthConfig(globalConfig?.authConfig ?? null, profile?.headerOverrides ?? null)
    : mergeAuthConfig(system.tableApiConfig, profile?.headerOverrides ?? null);

  return {
    systemId: system.systemId,
    systemCode: system.systemCode,
    tableApiUrl: columnApiUrl,
    columnApiUrl,
    tableApiAuthType,
    tableApiConfig,
    profileQueryParams: toQueryParams(profile?.tableListParams),
  };
};
