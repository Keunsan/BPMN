import "server-only";

import { buildMockColumns, listExternalTableCache, upsertExternalTableCache } from "@/lib/db/queries/external";
import * as systemQueries from "@/lib/db/queries/system";
import { fetchExternalColumns, fetchExternalTables } from "@/lib/external/client";
import type { ExternalColumn, ExternalTable, ExternalTableQuery } from "@/types/external";

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
    return filterTables(MOCK_TABLES, query);
  }

  if (query.mock) {
    return filterTables(MOCK_TABLES, query);
  }

  try {
    const tables = await fetchExternalTables(
      {
        systemId: system.systemId,
        systemCode: system.systemCode,
        tableApiUrl: system.tableApiUrl,
        tableApiAuthType: system.tableApiAuthType,
        tableApiConfig: system.tableApiConfig,
        columnApiUrl: system.columnApiUrl,
      },
      query,
    );

    if (tables.length > 0) {
      await upsertExternalTableCache(system.systemId, tables);
      return tables;
    }
  } catch {
    // 외부 API 장애 시 캐시 또는 mock으로 전환한다.
  }

  const cached = await listExternalTableCache(system.systemId, query);
  return cached.length > 0 ? cached : filterTables(MOCK_TABLES, query);
};

/** 외부 시스템 컬럼 목록을 조회한다. */
export const listExternalColumns = async (
  query: ExternalTableQuery & { tableName: string; mock?: boolean },
): Promise<ExternalColumn[]> => {
  const system = await systemQueries.findSystemById(query.systemId);
  if (!system || query.mock) {
    return buildMockColumns(query.tableName);
  }

  try {
    const columns = await fetchExternalColumns(
      {
        systemId: system.systemId,
        systemCode: system.systemCode,
        tableApiUrl: system.tableApiUrl,
        tableApiAuthType: system.tableApiAuthType,
        tableApiConfig: system.tableApiConfig,
        columnApiUrl: system.columnApiUrl,
      },
      query,
    );

    return columns.length > 0 ? columns : buildMockColumns(query.tableName);
  } catch {
    return buildMockColumns(query.tableName);
  }
};
