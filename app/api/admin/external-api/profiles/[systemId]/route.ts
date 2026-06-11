import { requireAuth } from "@/lib/api/auth";
import { withApiHandler } from "@/lib/api/route-handler";
import {
  getExternalApiParamProfile,
  saveExternalApiParamProfile,
} from "@/lib/services/external-api-config.service";
import type { UpsertExternalApiParamProfileDto } from "@/types/external-api";

/** GET /api/admin/external-api/profiles/[systemId] — 시스템별 파라미터 프로파일 조회 */
export const GET = withApiHandler(async ({ params }) => {
  const systemId = Number(params.systemId);
  const data = await getExternalApiParamProfile(systemId);

  return { data };
});

/** PUT /api/admin/external-api/profiles/[systemId] — 시스템별 파라미터 프로파일 저장 */
export const PUT = withApiHandler(async ({ request, params }) => {
  await requireAuth();
  const systemId = Number(params.systemId);
  const body = (await request.json()) as Omit<
    UpsertExternalApiParamProfileDto,
    "systemId"
  >;
  const data = await saveExternalApiParamProfile({
    ...body,
    systemId,
  });

  return { data };
});
