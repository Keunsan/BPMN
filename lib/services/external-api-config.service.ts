import "server-only";

import { ApiError } from "@/lib/api/error-handler";
import * as externalApiQueries from "@/lib/db/queries/external-api-config";
import * as systemQueries from "@/lib/db/queries/system";
import {
  fetchExternalColumns,
  fetchExternalTableResult,
} from "@/lib/external/client";
import {
  resolveTableListConfig,
  resolveTableSchemaConfig,
} from "@/lib/external/resolve-config";
import type {
  ExternalApiGlobalConfig,
  ExternalApiParamProfile,
  ExternalApiParamProfileDto,
  ExternalApiTestResult,
  TestExternalTableSchemaDto,
  UpsertExternalApiGlobalConfigDto,
  UpsertExternalApiParamProfileDto,
} from "@/types/external-api";

/** 외부 API 공통 설정을 조회한다. */
export const getGlobalExternalApiConfig =
  async (): Promise<ExternalApiGlobalConfig> => {
    const config = await externalApiQueries.getExternalApiGlobalConfig();
    if (!config) {
      throw new ApiError("E501", "External API config not found", 500);
    }

    return config;
  };

/** 외부 API 공통 설정을 저장한다. */
export const saveGlobalExternalApiConfig = async (
  input: UpsertExternalApiGlobalConfigDto,
): Promise<ExternalApiGlobalConfig> =>
  externalApiQueries.upsertExternalApiGlobalConfig(input);

/** 시스템별 파라미터 프로파일 목록을 조회한다. */
export const listExternalApiParamProfiles = async (): Promise<
  ExternalApiParamProfileDto[]
> => externalApiQueries.listExternalApiParamProfiles();

/** 시스템별 파라미터 프로파일을 조회한다. */
export const getExternalApiParamProfile = async (
  systemId: number,
): Promise<ExternalApiParamProfile | null> => {
  const system = await systemQueries.findSystemById(systemId);
  if (!system) {
    throw new ApiError("E301", "System not found", 404);
  }

  return externalApiQueries.findExternalApiParamProfileBySystemId(systemId);
};

/** 시스템별 파라미터 프로파일을 저장한다. */
export const saveExternalApiParamProfile = async (
  input: UpsertExternalApiParamProfileDto,
): Promise<ExternalApiParamProfile> => {
  const system = await systemQueries.findSystemById(input.systemId);
  if (!system) {
    throw new ApiError("E301", "System not found", 404);
  }

  return externalApiQueries.upsertExternalApiParamProfile(input);
};

/** 테이블 목록 API를 실제 외부 호출로 테스트한다. */
export const testExternalTableListApi = async (
  systemId: number,
): Promise<ExternalApiTestResult> => {
  const resolved = await resolveTableListConfig(systemId);
  if (!resolved) {
    throw new ApiError("E601", "Table list API config is not available", 400);
  }

  const tableResult = await fetchExternalTableResult(
    {
      systemId: resolved.systemId,
      systemCode: resolved.systemCode,
      tableApiUrl: resolved.tableApiUrl,
      tableApiAuthType: resolved.tableApiAuthType,
      tableApiConfig: resolved.tableApiConfig,
      columnApiUrl: resolved.columnApiUrl,
      profileQueryParams: resolved.profileQueryParams,
    },
    {},
  );

  return {
    kind: "TABLE_LIST",
    success: true,
    count: tableResult.returnedCount,
    testedAt: new Date().toISOString(),
    sample: tableResult.tables.slice(0, 5),
  };
};

/** 테이블 스키마 API를 실제 외부 호출로 테스트한다. */
export const testExternalTableSchemaApi = async (
  systemId: number,
  input: TestExternalTableSchemaDto,
): Promise<ExternalApiTestResult> => {
  const tableName = input.tableName.trim();
  if (!tableName) {
    throw new ApiError("E001", "Table name is required", 400, undefined, "tableName");
  }

  const resolved = await resolveTableSchemaConfig(systemId);
  if (!resolved) {
    throw new ApiError("E601", "Table schema API config is not available", 400);
  }

  const columns = await fetchExternalColumns(
    {
      systemId: resolved.systemId,
      systemCode: resolved.systemCode,
      tableApiUrl: resolved.tableApiUrl,
      tableApiAuthType: resolved.tableApiAuthType,
      tableApiConfig: resolved.tableApiConfig,
      columnApiUrl: resolved.columnApiUrl,
      profileQueryParams: resolved.profileQueryParams,
    },
    {
      tableName,
      schemaName: input.schemaName?.trim() || undefined,
    },
  );

  return {
    kind: "TABLE_SCHEMA",
    success: true,
    count: columns.length,
    testedAt: new Date().toISOString(),
    sample: columns.slice(0, 5),
  };
};
