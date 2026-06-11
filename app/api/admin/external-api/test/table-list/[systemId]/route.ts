import { requireAuth } from "@/lib/api/auth";
import { withApiHandler } from "@/lib/api/route-handler";
import { testExternalTableListApi } from "@/lib/services/external-api-config.service";

/** POST /api/admin/external-api/test/table-list/[systemId] — 테이블 목록 API 연결 테스트 */
export const POST = withApiHandler(async ({ params }) => {
  await requireAuth();
  const data = await testExternalTableListApi(Number(params.systemId));

  return { data };
});
