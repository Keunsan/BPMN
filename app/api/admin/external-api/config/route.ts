import { requireAuth } from "@/lib/api/auth";
import { withApiHandler } from "@/lib/api/route-handler";
import {
  getGlobalExternalApiConfig,
  saveGlobalExternalApiConfig,
} from "@/lib/services/external-api-config.service";
import type { UpsertExternalApiGlobalConfigDto } from "@/types/external-api";

/** GET /api/admin/external-api/config — 외부 API 공통 설정 조회 */
export const GET = withApiHandler(async () => {
  const data = await getGlobalExternalApiConfig();
  return { data };
});

/** PUT /api/admin/external-api/config — 외부 API 공통 설정 저장 */
export const PUT = withApiHandler(async ({ request }) => {
  await requireAuth();
  const body = (await request.json()) as UpsertExternalApiGlobalConfigDto;
  const data = await saveGlobalExternalApiConfig(body);

  return { data };
});
