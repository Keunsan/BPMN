import { withApiHandler } from "@/lib/api/route-handler";
import { lookupCommonCodes } from "@/lib/services/common-code.service";

/** GET /api/admin/codes/lookup?groupCode=XXX — 활성 공통코드 lookup */
export const GET = withApiHandler(async ({ request, locale }) => {
  const { searchParams } = new URL(request.url);
  const groupCode = searchParams.get("groupCode");

  if (!groupCode) {
    return { data: [] };
  }

  const data = await lookupCommonCodes(groupCode, locale);
  return { data };
});
