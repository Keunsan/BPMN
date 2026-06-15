import "server-only";

import { getDevSessionStatus, isAuthEnabled } from "@/lib/auth/config";
import { ApiError } from "@/lib/api/error-handler";
import { SESSION_TIMEOUT_MS } from "@/lib/session/constants";
import {
  clearSessionCookie,
  createSessionPayload,
  extendSessionPayload,
  readSession,
  writeSession,
} from "@/lib/session/server";
import type { SessionStatus } from "@/types/session";

const toSessionStatus = (payload: {
  userId: number;
  userAccount: string;
  expiresAt: number;
}): SessionStatus => {
  const remainingMs = Math.max(0, payload.expiresAt - Date.now());
  return {
    userId: payload.userId,
    userAccount: payload.userAccount,
    expiresAt: payload.expiresAt,
    timeoutMs: SESSION_TIMEOUT_MS,
    remainingMs,
  };
};

/** 현재 세션 상태를 반환한다 */
export const getSessionStatus = async (): Promise<SessionStatus | null> => {
  if (!isAuthEnabled()) {
    return getDevSessionStatus();
  }

  const payload = await readSession();
  if (!payload) {
    return null;
  }
  return toSessionStatus(payload);
};

/** 로그인 세션을 생성한다 (stub — Supabase 연동 전) */
export const loginSession = async (): Promise<SessionStatus> => {
  if (!isAuthEnabled()) {
    return getDevSessionStatus();
  }

  const payload = createSessionPayload(1, "dev@pams.local");
  await writeSession(payload);
  return toSessionStatus(payload);
};

/** 세션을 연장한다 */
export const extendSession = async (): Promise<SessionStatus> => {
  if (!isAuthEnabled()) {
    return getDevSessionStatus();
  }

  const payload = await readSession();
  if (!payload) {
    throw new ApiError("E101", "Session expired", 401);
  }

  const extended = extendSessionPayload(payload);
  await writeSession(extended);
  return toSessionStatus(extended);
};

/** 세션을 종료한다 */
export const logoutSession = async (): Promise<void> => {
  if (!isAuthEnabled()) {
    return;
  }

  await clearSessionCookie();
};
