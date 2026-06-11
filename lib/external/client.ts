import "server-only";

import { ApiError } from "@/lib/api/error-handler";
import type { ExternalColumn, ExternalTable, SystemApiConfig } from "@/types/external";

type ExternalApiConfig = SystemApiConfig & {
  systemId: number;
  systemCode: string;
};

type AuthConfig = {
  username?: string;
  password?: string;
  token?: string;
  apiKey?: string;
  apiKeyHeader?: string;
  apiKeyQuery?: string;
};

const REQUEST_TIMEOUT_MS = 15_000;

const asAuthConfig = (
  value: Record<string, unknown> | null,
): AuthConfig => (value ?? {}) as AuthConfig;

const appendQuery = (
  url: string,
  params: Record<string, string | undefined>,
): string => {
  const parsed = new URL(url);
  for (const [key, value] of Object.entries(params)) {
    if (value) {
      parsed.searchParams.set(key, value);
    }
  }
  return parsed.toString();
};

const buildHeaders = (config: ExternalApiConfig): HeadersInit => {
  const headers: Record<string, string> = { Accept: "application/json" };
  const auth = asAuthConfig(config.tableApiConfig);

  if (config.tableApiAuthType === "BASIC" && auth.username && auth.password) {
    headers.Authorization = `Basic ${Buffer.from(
      `${auth.username}:${auth.password}`,
    ).toString("base64")}`;
  }

  if (config.tableApiAuthType === "OAUTH" && auth.token) {
    headers.Authorization = `Bearer ${auth.token}`;
  }

  if (config.tableApiAuthType === "API_KEY" && auth.apiKey) {
    headers[auth.apiKeyHeader || "X-API-Key"] = auth.apiKey;
  }

  return headers;
};

const requestJson = async <T>(url: string, config: ExternalApiConfig): Promise<T> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: buildHeaders(config),
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      throw new ApiError(
        "E601",
        `External API failed: ${response.status}`,
        502,
      );
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      "E601",
      error instanceof Error ? error.message : "External API failed",
      502,
    );
  } finally {
    clearTimeout(timer);
  }
};

const normalizeTable = (value: Record<string, unknown>): ExternalTable => ({
  schemaName:
    (value.schemaName as string | null | undefined) ??
    (value.schema as string | null | undefined) ??
    null,
  tableName:
    (value.tableName as string | undefined) ??
    (value.name as string | undefined) ??
    "",
  tableNameKor:
    (value.tableNameKor as string | null | undefined) ??
    (value.tableNameKo as string | null | undefined) ??
    (value.koreanName as string | null | undefined) ??
    null,
  tableType:
    (value.tableType as string | null | undefined) ??
    (value.type as string | null | undefined) ??
    null,
  description: (value.description as string | null | undefined) ?? null,
  recordCount: (value.recordCount as number | null | undefined) ?? null,
});

const normalizeColumn = (value: Record<string, unknown>): ExternalColumn => ({
  columnName:
    (value.columnName as string | undefined) ??
    (value.name as string | undefined) ??
    "",
  columnNameKor:
    (value.columnNameKor as string | null | undefined) ??
    (value.columnNameKo as string | null | undefined) ??
    (value.koreanName as string | null | undefined) ??
    null,
  dataType:
    (value.dataType as string | undefined) ??
    (value.type as string | undefined) ??
    "UNKNOWN",
  dataLength: (value.dataLength as number | null | undefined) ?? null,
  isNullable: Boolean(value.isNullable ?? value.nullable ?? true),
  isPrimaryKey: Boolean(value.isPrimaryKey ?? value.primaryKey ?? false),
  isForeignKey: Boolean(value.isForeignKey ?? value.foreignKey ?? false),
  defaultValue: (value.defaultValue as string | null | undefined) ?? null,
  description: (value.description as string | null | undefined) ?? null,
});

const unwrapArray = (value: unknown): Record<string, unknown>[] => {
  if (Array.isArray(value)) {
    return value as Record<string, unknown>[];
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (Array.isArray(record.data)) {
      return record.data as Record<string, unknown>[];
    }
    if (Array.isArray(record.tables)) {
      return record.tables as Record<string, unknown>[];
    }
    if (Array.isArray(record.columns)) {
      return record.columns as Record<string, unknown>[];
    }
  }

  return [];
};

/** 외부 시스템 테이블 목록을 조회한다. */
export const fetchExternalTables = async (
  config: ExternalApiConfig,
  query: { schemaName?: string; search?: string },
): Promise<ExternalTable[]> => {
  if (!config.tableApiUrl) {
    return [];
  }

  const auth = asAuthConfig(config.tableApiConfig);
  const url = appendQuery(config.tableApiUrl, {
    schemaName: query.schemaName,
    search: query.search,
    ...(config.tableApiAuthType === "API_KEY" && auth.apiKeyQuery && auth.apiKey
      ? { [auth.apiKeyQuery]: auth.apiKey }
      : {}),
  });
  const payload = await requestJson<unknown>(url, config);

  return unwrapArray(payload)
    .map(normalizeTable)
    .filter((table) => table.tableName);
};

/** 외부 시스템 컬럼 목록을 조회한다. */
export const fetchExternalColumns = async (
  config: ExternalApiConfig,
  query: { schemaName?: string; tableName: string },
): Promise<ExternalColumn[]> => {
  const endpoint = config.columnApiUrl || config.tableApiUrl;
  if (!endpoint) {
    return [];
  }

  const auth = asAuthConfig(config.tableApiConfig);
  const url = appendQuery(endpoint, {
    schemaName: query.schemaName,
    tableName: query.tableName,
    ...(config.tableApiAuthType === "API_KEY" && auth.apiKeyQuery && auth.apiKey
      ? { [auth.apiKeyQuery]: auth.apiKey }
      : {}),
  });
  const payload = await requestJson<unknown>(url, config);

  return unwrapArray(payload)
    .map(normalizeColumn)
    .filter((column) => column.columnName);
};
