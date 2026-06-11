import "server-only";

import type { ExternalColumn, ExternalTable } from "@/types/external";

import { execute, query, type QueryParams } from "../pool";

/** 외부 테이블 캐시 목록을 조회한다. */
export const listExternalTableCache = async (
  systemId: number,
  filters: { schemaName?: string; search?: string } = {},
): Promise<ExternalTable[]> => {
  const conditions = [
    "system_id = @systemId",
    "(expires_at IS NULL OR expires_at > GETDATE())",
  ];
  const params: QueryParams = { systemId };

  if (filters.schemaName?.trim()) {
    conditions.push("schema_name = @schemaName");
    params.schemaName = filters.schemaName.trim();
  }
  if (filters.search?.trim()) {
    conditions.push(
      "(table_name LIKE @search OR table_name_kor LIKE @search OR description LIKE @search)",
    );
    params.search = `%${filters.search.trim()}%`;
  }

  const rows = await query<Record<string, unknown>>(
    `SELECT TOP 200 *
     FROM external_table_cache
     WHERE ${conditions.join(" AND ")}
     ORDER BY schema_name, table_name`,
    params,
  );

  return rows.map((row) => ({
    schemaName: (row.schema_name as string | null) ?? null,
    tableName: row.table_name as string,
    tableNameKor: (row.table_name_kor as string | null) ?? null,
    tableType: (row.table_type as string | null) ?? null,
    description: (row.description as string | null) ?? null,
    recordCount: (row.record_count as number | null) ?? null,
  }));
};

/** 외부 테이블 캐시를 upsert한다. */
export const upsertExternalTableCache = async (
  systemId: number,
  tables: ExternalTable[],
  ttlMinutes = 60,
): Promise<void> => {
  for (const table of tables) {
    await execute(
      `MERGE external_table_cache AS target
       USING (
         SELECT
           @systemId AS system_id,
           @schemaName AS schema_name,
           @tableName AS table_name
       ) AS source
       ON target.system_id = source.system_id
        AND ISNULL(target.schema_name, '') = ISNULL(source.schema_name, '')
        AND target.table_name = source.table_name
       WHEN MATCHED THEN
         UPDATE SET
           table_name_kor = @tableNameKor,
           table_type = @tableType,
           description = @description,
           record_count = @recordCount,
           cached_at = GETDATE(),
           expires_at = DATEADD(MINUTE, @ttlMinutes, GETDATE())
       WHEN NOT MATCHED THEN
         INSERT (
           system_id, schema_name, table_name, table_name_kor, table_type,
           description, record_count, expires_at
         )
         VALUES (
           @systemId, @schemaName, @tableName, @tableNameKor, @tableType,
           @description, @recordCount, DATEADD(MINUTE, @ttlMinutes, GETDATE())
         );`,
      {
        systemId,
        schemaName: table.schemaName ?? null,
        tableName: table.tableName,
        tableNameKor: table.tableNameKor ?? null,
        tableType: table.tableType ?? null,
        description: table.description ?? null,
        recordCount: table.recordCount ?? null,
        ttlMinutes,
      },
    );
  }
};

/** Mock 컬럼 메타데이터를 생성한다. */
export const buildMockColumns = (tableName: string): ExternalColumn[] => [
  {
    columnName: `${tableName.toLowerCase()}_id`,
    columnNameKor: "ID",
    dataType: "BIGINT",
    dataLength: null,
    isNullable: false,
    isPrimaryKey: true,
    isForeignKey: false,
    defaultValue: null,
    description: "Mock primary key",
  },
  {
    columnName: "name",
    columnNameKor: "명칭",
    dataType: "NVARCHAR",
    dataLength: 200,
    isNullable: false,
    isPrimaryKey: false,
    isForeignKey: false,
    defaultValue: null,
    description: "Mock name column",
  },
  {
    columnName: "created_at",
    columnNameKor: "생성일시",
    dataType: "DATETIME",
    dataLength: null,
    isNullable: false,
    isPrimaryKey: false,
    isForeignKey: false,
    defaultValue: "GETDATE()",
    description: "Mock created timestamp",
  },
];
