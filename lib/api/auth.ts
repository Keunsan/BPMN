/** 인증 컨텍스트 — Day 5 Supabase 연동 전 stub */
export type AuthContext = {
  userId: number;
  userAccount: string;
};

/**
 * API 인증 검사 (현재 stub — Supabase Auth 홀딩)
 * @throws {ApiError} E101 — 인증 실패 시
 */
export const requireAuth = async (): Promise<AuthContext> => {
  // TODO: Supabase 세션 검증으로 교체
  return { userId: 1, userAccount: "dev@pams.local" };
};

/** 선택적 인증 — 미로그인 시 null */
export const getOptionalAuth = async (): Promise<AuthContext | null> => {
  try {
    return await requireAuth();
  } catch {
    return null;
  }
};
