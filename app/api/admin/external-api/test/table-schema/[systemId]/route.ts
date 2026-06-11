import { requireAuth } from "@/lib/api/auth";
import { withApiHandler } from "@/lib/api/route-handler";
import { testExternalTableSchemaApi } from "@/lib/services/external-api-config.service";
import type { TestExternalTableSchemaDto } from "@/types/external-api";

/** POST /api/admin/external-api/test/table-schema/[systemId] — 테이블 스키마 API 연결 테스트 */
export const POST = withApiHandler(async ({ request, params }) => {
  await requireAuth();
  const body = (await request.json()) as TestExternalTableSchemaDto;
  const data = await testExternalTableSchemaApi(Number(params.systemId), body);

  return { data };
});
