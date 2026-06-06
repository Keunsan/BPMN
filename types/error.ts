/** API 성공 응답 — PRD 9.1 */
export interface ApiResponse<T> {
  success: true;
  data: T;
  meta?: ApiResponseMeta;
}

export interface ApiResponseMeta {
  page?: number;
  limit?: number;
  total?: number;
}

/** API 에러 응답 — PRD 9.1 */
export interface ApiErrorResponse {
  success: false;
  error: ApiErrorBody;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  details?: string;
  field?: string;
  timestamp: string;
  traceId?: string;
}

export type ApiResult<T> = ApiResponse<T> | ApiErrorResponse;

export type ErrorCategory =
  | "VALIDATION"
  | "AUTH"
  | "PERMISSION"
  | "RESOURCE"
  | "BUSINESS"
  | "SYSTEM"
  | "EXTERNAL";

export interface ErrorCodeRecord {
  codeId: number;
  errorCode: string;
  httpStatus: number;
  category: ErrorCategory;
  isRetryable: boolean;
  message: string;
}
