import "server-only";

import { ApiError } from "@/lib/api/error-handler";
import {
  buildMockColumns,
  upsertExternalTableCache,
} from "@/lib/db/queries/external";
import * as systemQueries from "@/lib/db/queries/system";
import { fetchExternalColumns, fetchExternalTables } from "@/lib/external/client";
import {
  resolveTableListConfig,
  resolveTableSchemaConfig,
} from "@/lib/external/resolve-config";
import type {
  ExternalColumn,
  ExternalTable,
  ExternalTableQuery,
} from "@/types/external";

const MOCK_TABLES: ExternalTable[] = [
  {
    schemaName: "dbo",
    tableName: "process_order",
    tableNameKor: "공정오더",
    tableType: "BASE TABLE",
    description: "Mock ERP process order table",
    recordCount: 12_500,
  },
  {
    schemaName: "dbo",
    tableName: "material_master",
    tableNameKor: "자재마스터",
    tableType: "BASE TABLE",
    description: "Mock material master table",
    recordCount: 42_000,
  },
  {
    schemaName: "if",
    tableName: "approval_request_v",
    tableNameKor: "결재요청뷰",
    tableType: "VIEW",
    description: "Mock approval request view",
    recordCount: 3_100,
  },
];

const filterTables = (
  tables: ExternalTable[],
  query: Pick<ExternalTableQuery, "schemaName" | "search">,
): ExternalTable[] =>
  tables.filter((table) => {
    const schemaMatched = query.schemaName
      ? table.schemaName === query.schemaName
      : true;
    const keyword = query.search?.trim().toLowerCase();
    const searchMatched = keyword
      ? [table.tableName, table.tableNameKor, table.description]
          .filter(Boolean)
          .some((value) => value?.toLowerCase().includes(keyword))
      : true;

    return schemaMatched && searchMatched;
  });

/** 외부 시스템 테이블 목록을 조회한다. */
export const listExternalTables = async (
  query: ExternalTableQuery & { mock?: boolean },
): Promise<ExternalTable[]> => {
  const system = await systemQueries.findSystemById(query.systemId);
  if (!system) {
    throw new ApiError("E301", "System not found", 404);
  }

  if (query.mock) {
    return filterTables(MOCK_TABLES, query);
  }

  const resolved = await resolveTableListConfig(query.systemId);
  if (!resolved) {
    throw new ApiError("E601", "Table list API config is not available", 400);
  }

  const tables = await fetchExternalTables(
    {
      systemId: resolved.systemId,
      systemCode: resolved.systemCode,
      tableApiUrl: resolved.tableApiUrl,
      tableApiAuthType: resolved.tableApiAuthType,
      tableApiConfig: resolved.tableApiConfig,
      columnApiUrl: resolved.columnApiUrl,
      profileQueryParams: resolved.profileQueryParams,
    },
    query,
  );

  if (tables.length > 0) {
    void upsertExternalTableCache(system.systemId, tables.slice(0, 200)).catch(
      () => undefined,
    );
  }

  return tables;
};

/** 외부 시스템 컬럼 목록을 조회한다. */
export const listExternalColumns = async (
  query: ExternalTableQuery & { tableName: string; mock?: boolean },
): Promise<ExternalColumn[]> => {
  const system = await systemQueries.findSystemById(query.systemId);
  if (!system) {
    throw new ApiError("E301", "System not found", 404);
  }

  if (query.mock) {
    return buildMockColumns(query.tableName);
  }

  const resolved = await resolveTableSchemaConfig(query.systemId);
  if (!resolved) {
    throw new ApiError("E601", "Table schema API config is not available", 400);
  }

  return fetchExternalColumns(
    {
      systemId: resolved.systemId,
      systemCode: resolved.systemCode,
      tableApiUrl: resolved.tableApiUrl,
      tableApiAuthType: resolved.tableApiAuthType,
      tableApiConfig: resolved.tableApiConfig,
      columnApiUrl: resolved.columnApiUrl,
      profileQueryParams: resolved.profileQueryParams,
    },
    query,
  );
};
