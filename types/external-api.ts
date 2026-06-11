import type { ApiAuthType } from "@/types/system";
import type { ExternalColumn, ExternalTable } from "@/types/external";

/** 외부 API 공통 설정 */
export interface ExternalApiGlobalConfig {
  configId: number;
  tableListApiUrl: string | null;
  tableSchemaApiUrl: string | null;
  authType: ApiAuthType;
  authConfig: Record<string, unknown> | null;
  updatedAt: Date | null;
}

export interface UpsertExternalApiGlobalConfigDto {
  tableListApiUrl?: string | null;
  tableSchemaApiUrl?: string | null;
  authType?: ApiAuthType;
  authConfig?: Record<string, unknown> | null;
}

/** 시스템별 외부 API 호출 파라미터 프로파일 */
export interface ExternalApiParamProfile {
  profileId: number;
  systemId: number;
  tableListParams: Record<string, unknown> | null;
  headerOverrides: Record<string, unknown> | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date | null;
}

export interface ExternalApiParamProfileDto extends ExternalApiParamProfile {
  systemCode?: string;
  systemName?: string;
}

export interface UpsertExternalApiParamProfileDto {
  systemId: number;
  tableListParams?: Record<string, unknown> | null;
  headerOverrides?: Record<string, unknown> | null;
  isActive?: boolean;
}

export type ExternalApiTestKind = "TABLE_LIST" | "TABLE_SCHEMA";

export interface ExternalApiTestResult {
  kind: ExternalApiTestKind;
  success: boolean;
  count: number;
  testedAt: string;
  sample: ExternalTable[] | ExternalColumn[];
}

export interface TestExternalTableSchemaDto {
  tableName: string;
  schemaName?: string | null;
}
