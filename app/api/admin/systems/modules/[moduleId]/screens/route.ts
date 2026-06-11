import { requireAuth } from "@/lib/api/auth";
import { withApiHandler } from "@/lib/api/route-handler";
import { createScreen, listScreens } from "@/lib/services/system.service";
import type { UpsertSystemScreenDto } from "@/types/system";

/** GET /api/admin/systems/modules/[moduleId]/screens — 화면 목록 */
export const GET = withApiHandler(async ({ params }) => {
  const data = await listScreens(Number(params.moduleId));
  return { data };
});

/** POST /api/admin/systems/modules/[moduleId]/screens — 화면 생성 */
export const POST = withApiHandler(async ({ request, params }) => {
  await requireAuth();
  const body = (await request.json()) as UpsertSystemScreenDto;
  const data = await createScreen({
    ...body,
    moduleId: Number(params.moduleId),
  });

  return { data, status: 201 };
});
