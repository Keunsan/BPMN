/** DB 공통 타입 */

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
}

/** snake_case DB 행 → camelCase 변환 헬퍼용 */
export type DbRow = Record<string, unknown>;

export interface AuditFields {
  createdBy: number | null;
  createdAt: Date;
  updatedBy: number | null;
  updatedAt: Date | null;
}
