import { withApiHandler } from "@/lib/api/route-handler";
import { listModules } from "@/lib/services/system.service";

/** GET /api/admin/systems/[systemId]/modules — 공통 모듈(MODULE_CD) 목록 */
export const GET = withApiHandler(async ({ params, locale }) => {
  const data = await listModules(Number(params.systemId), locale);
  return { data };
});
