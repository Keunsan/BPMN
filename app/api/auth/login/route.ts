import { withApiHandler } from "@/lib/api/route-handler";
import { loginSession } from "@/lib/services/session.service";

/** 로그인 — 세션 쿠키 발급 (stub) */
export const POST = withApiHandler(async () => {
  const session = await loginSession();
  return { data: session };
});
