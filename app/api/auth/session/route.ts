import { ApiError } from "@/lib/api/error-handler";
import { withApiHandler } from "@/lib/api/route-handler";
import {
  extendSession,
  getSessionStatus,
  logoutSession,
} from "@/lib/services/session.service";

/** 세션 상태 조회 */
export const GET = withApiHandler(async () => {
  const session = await getSessionStatus();
  if (!session) {
    throw new ApiError("E101", "Session expired", 401);
  }
  return { data: session };
});

/** 세션 연장 */
export const POST = withApiHandler(async () => {
  const session = await extendSession();
  return { data: session };
});

/** 로그아웃 — 세션 삭제 */
export const DELETE = withApiHandler(async () => {
  await logoutSession();
  return { data: { loggedOut: true } };
});
