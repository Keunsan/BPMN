/** 클라이언트 세션 상태 */
export type SessionStatus = {
  userId: number;
  userAccount: string;
  expiresAt: number;
  timeoutMs: number;
  remainingMs: number;
};
