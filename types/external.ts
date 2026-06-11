export interface ExternalTable {
  schemaName: string | null;
  tableName: string;
  tableNameKor: string | null;
  tableType: string | null;
  description: string | null;
  recordCount: number | null;
}

export interface ExternalColumn {
  columnName: string;
  columnNameKor: string | null;
  dataType: string;
  dataLength: number | null;
  isNullable: boolean;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  defaultValue: string | null;
  description: string | null;
}

import type { ApiAuthType } from "@/types/system";

export interface SystemApiConfig {
  tableApiUrl: string | null;
  tableApiAuthType: ApiAuthType | null;
  tableApiConfig: Record<string, unknown> | null;
  columnApiUrl: string | null;
}

export interface ExternalTableQuery {
  systemId: number;
  schemaName?: string;
  search?: string;
}
