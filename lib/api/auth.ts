import { ApiError } from "@/lib/api/error-handler";
import { readSession } from "@/lib/session/server";

/** 인증 컨텍스트 — Day 5 Supabase 연동 전 쿠키 세션 */
export type AuthContext = {
  userId: number;
  userAccount: string;
};

/**
 * API 인증 검사 — 세션 쿠키 검증
 * @throws {ApiError} E101 — 인증 실패 시
 */
export const requireAuth = async (): Promise<AuthContext> => {
  const session = await readSession();
  if (!session) {
    throw new ApiError("E101", "Authentication required", 401);
  }

  return {
    userId: session.userId,
    userAccount: session.userAccount,
  };
};

/** 선택적 인증 — 미로그인 시 null */
export const getOptionalAuth = async (): Promise<AuthContext | null> => {
  try {
    return await requireAuth();
  } catch {
    return null;
  }
};
