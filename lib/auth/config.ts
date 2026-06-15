import { SESSION_TIMEOUT_MS } from "@/lib/session/constants";
import type { SessionStatus } from "@/types/session";

/** 개발용 stub 사용자 — Supabase 연동 전·인증 비활성 시 사용 */
export const DEV_AUTH_USER = {
  userId: 1,
  userAccount: "dev@pams.local",
} as const;

/**
 * 인증·세션 검사 활성 여부
 * - development: 기본 off (로그인·세션 타이머 없이 바로 접근)
 * - production: 기본 on
 * - NEXT_PUBLIC_PAMS_AUTH_ENABLED=true|false 로 명시적 override 가능
 */
export const isAuthEnabled = (): boolean => {
  const override = process.env.NEXT_PUBLIC_PAMS_AUTH_ENABLED;
  if (override === "true") {
    return true;
  }
  if (override === "false") {
    return false;
  }
  return process.env.NODE_ENV === "production";
};

/** 인증 비활성 시 UI·API에 사용할 stub 세션 */
export const getDevSessionStatus = (): SessionStatus => {
  const expiresAt = Date.now() + SESSION_TIMEOUT_MS;
  return {
    userId: DEV_AUTH_USER.userId,
    userAccount: DEV_AUTH_USER.userAccount,
    expiresAt,
    timeoutMs: SESSION_TIMEOUT_MS,
    remainingMs: SESSION_TIMEOUT_MS,
  };
};
