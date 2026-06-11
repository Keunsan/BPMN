import { requireAuth } from "@/lib/api/auth";
import { withApiHandler } from "@/lib/api/route-handler";
import { createModule, listModules } from "@/lib/services/system.service";
import type { UpsertSystemModuleDto } from "@/types/system";

/** GET /api/admin/systems/[systemId]/modules — 모듈 목록 */
export const GET = withApiHandler(async ({ params }) => {
  const data = await listModules(Number(params.systemId));
  return { data };
});

/** POST /api/admin/systems/[systemId]/modules — 모듈 생성 */
export const POST = withApiHandler(async ({ request, params }) => {
  await requireAuth();
  const body = (await request.json()) as UpsertSystemModuleDto;
  const data = await createModule({
    ...body,
    systemId: Number(params.systemId),
  });

  return { data, status: 201 };
});
