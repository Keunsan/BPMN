import { withApiHandler } from "@/lib/api/route-handler";
import { listExternalColumns } from "@/lib/services/external.service";

/** GET /api/external/systems/[systemId]/tables/[tableName]/columns — 컬럼 목록 */
export const GET = withApiHandler(async ({ request, params }) => {
  const { searchParams } = new URL(request.url);
  const data = await listExternalColumns({
    systemId: Number(params.systemId),
    tableName: decodeURIComponent(params.tableName),
    schemaName: searchParams.get("schemaName") ?? undefined,
    mock: searchParams.get("mock") === "true",
  });

  return { data };
});
