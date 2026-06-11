import { withApiHandler } from "@/lib/api/route-handler";
import { listExternalApiParamProfiles } from "@/lib/services/external-api-config.service";

/** GET /api/admin/external-api/profiles — 시스템별 파라미터 프로파일 목록 */
export const GET = withApiHandler(async () => {
  const data = await listExternalApiParamProfiles();
  return { data };
});
