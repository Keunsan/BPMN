import createMiddleware from "next-intl/middleware";

import { routing } from "@/lib/i18n/routing";

export default createMiddleware(routing);

export const config = {
  // API 및 정적 파일 제외
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
