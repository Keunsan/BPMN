import { randomUUID } from "node:crypto";

import type { Locale } from "@/lib/i18n/config";
import type { ApiErrorBody, ApiErrorResponse } from "@/types/error";

/** API 에러 클래스 — PRD 9.4 */
export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public details?: string,
    public field?: string,
    public traceId?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }

  get isRetryable(): boolean {
    return ["E305", "E501", "E502", "E503", "E601", "E602", "E603", "E604"].includes(
      this.code,
    );
  }

  get isAuthError(): boolean {
    return this.code.startsWith("E1");
  }

  get isPermissionError(): boolean {
    return this.code.startsWith("E2");
  }

  toResponse(): ApiErrorResponse {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
        field: this.field,
        timestamp: new Date().toISOString(),
        traceId: this.traceId,
      },
    };
  }
}

/** 로그 연계용 추적 ID 생성 */
export function generateTraceId(): string {
  return randomUUID();
}

/** 기본 에러 메시지 (DB 조회 실패 시 fallback) */
const defaultErrorMessages: Record<string, Record<Locale, string>> = {
  E001: {
    ko: "필수 입력값이 누락되었습니다.",
    en: "Required field is missing.",
    "zh-TW": "必填欄位缺失。",
  },
  E301: {
    ko: "요청한 데이터를 찾을 수 없습니다.",
    en: "Requested data not found.",
    "zh-TW": "找不到請求的數據。",
  },
  E302: {
    ko: "프로세스를 찾을 수 없습니다.",
    en: "Process not found.",
    "zh-TW": "找不到流程。",
  },
  E304: {
    ko: "이미 존재하는 코드입니다.",
    en: "Code already exists.",
    "zh-TW": "代碼已存在。",
  },
  E401: {
    ko: "하위 프로세스가 존재하여 삭제할 수 없습니다.",
    en: "Cannot delete: child processes exist.",
    "zh-TW": "無法刪除：存在子流程。",
  },
  E403: {
    ko: "Published 상태는 직접 수정할 수 없습니다.",
    en: "Cannot directly modify Published status.",
    "zh-TW": "無法直接修改已發布狀態。",
  },
  E406: {
    ko: "연결된 시스템에 속하지 않는 화면입니다.",
    en: "Screen does not belong to the linked system.",
    "zh-TW": "畫面不屬於已連接的系統。",
  },
  E409: {
    ko: "연결된 데이터가 있어 삭제 전 확인이 필요합니다.",
    en: "Linked data exists. Please confirm before deleting.",
    "zh-TW": "存在關聯資料，刪除前需要確認。",
  },
  E501: {
    ko: "시스템 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
    en: "System error occurred. Please try again later.",
    "zh-TW": "發生系統錯誤。請稍後再試。",
  },
  E502: {
    ko: "데이터베이스 오류가 발생했습니다.",
    en: "Database error occurred.",
    "zh-TW": "發生數據庫錯誤。",
  },
};

/** 에러 코드별 다국어 메시지 조회 (DB 우선, fallback 사용) */
export async function getErrorMessage(
  code: string,
  locale: Locale,
  fetchFromDb?: (code: string, locale: Locale) => Promise<string | null>,
): Promise<string> {
  if (fetchFromDb) {
    try {
      const dbMessage = await fetchFromDb(code, locale);
      if (dbMessage) {
        return dbMessage;
      }
    } catch {
      // DB 조회 실패 시 fallback 메시지 사용 (에러 응답 생성 중 2차 DB 장애 방지)
    }
  }

  return (
    defaultErrorMessages[code]?.[locale] ??
    defaultErrorMessages[code]?.ko ??
    defaultErrorMessages.E501[locale]
  );
}

/** ApiErrorResponse 생성 */
export async function createErrorResponse(
  error: ApiError,
  locale: Locale,
  fetchFromDb?: (code: string, locale: Locale) => Promise<string | null>,
): Promise<ApiErrorResponse> {
  const message = await getErrorMessage(error.code, locale, fetchFromDb);

  const body: ApiErrorBody = {
    code: error.code,
    message,
    details: error.details,
    field: error.field,
    timestamp: new Date().toISOString(),
    traceId: error.traceId ?? generateTraceId(),
  };

  return { success: false, error: body };
}

/** unknown 에러를 ApiError로 변환 */
export function toApiError(error: unknown, traceId?: string): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  const message = error instanceof Error ? error.message : "Unknown error";
  const isDbConnectionError =
    message.includes("self-signed certificate") ||
    message.includes("ESOCKET") ||
    message.includes("ConnectionError") ||
    (typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "ESOCKET");

  if (isDbConnectionError) {
    return new ApiError("E502", message, 502, message, undefined, traceId);
  }

  const isFkConstraintError =
    message.includes("REFERENCE constraint") ||
    message.includes("FK_");

  if (isFkConstraintError) {
    return new ApiError(
      "E409",
      "Linked data exists. Confirm cascade delete before deleting this process.",
      409,
      message,
      undefined,
      traceId,
    );
  }

  return new ApiError("E501", message, 500, message, undefined, traceId);
}
