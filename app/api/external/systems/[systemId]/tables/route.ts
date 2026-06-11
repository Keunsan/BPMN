import { withApiHandler } from "@/lib/api/route-handler";
import { listExternalTables } from "@/lib/services/external.service";

/** GET /api/external/systems/[systemId]/tables — 외부 테이블 목록 */
export const GET = withApiHandler(async ({ request, params }) => {
  const { searchParams } = new URL(request.url);
  const data = await listExternalTables({
    systemId: Number(params.systemId),
    schemaName: searchParams.get("schemaName") ?? undefined,
    search: searchParams.get("search") ?? undefined,
    mock: searchParams.get("mock") === "true",
  });

  return { data };
});
