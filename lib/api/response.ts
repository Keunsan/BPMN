import { NextResponse } from "next/server";

import { findErrorMessage } from "@/lib/db/queries/error";
import type { ApiResponseMeta } from "@/types/error";

/** 성공 응답 생성 — PRD 9.1 */
export const successResponse = <T>(
  data: T,
  meta?: ApiResponseMeta,
  status = 200,
): NextResponse => {
  return NextResponse.json(
    { success: true as const, data, ...(meta ? { meta } : {}) },
    { status },
  );
};

export {
  ApiError,
  createErrorResponse,
  generateTraceId,
  toApiError,
} from "./error-handler";

/** 개발 환경에서 상세 에러 로그 출력 */
export const logApiError = (
  traceId: string,
  error: unknown,
  context?: string,
): void => {
  if (process.env.NODE_ENV === "development") {
    console.error(`[API ${traceId}]${context ? ` ${context}:` : ""}`, error);
  }
};

/** DB 연동 다국어 에러 메시지 fetcher */
export const fetchErrorFromDb = findErrorMessage;
