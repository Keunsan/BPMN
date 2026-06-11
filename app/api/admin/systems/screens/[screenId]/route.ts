import { requireAuth } from "@/lib/api/auth";
import { withApiHandler } from "@/lib/api/route-handler";
import {
  deactivateScreen,
  updateScreen,
} from "@/lib/services/system.service";
import type { UpsertSystemScreenDto } from "@/types/system";

/** PUT /api/admin/systems/screens/[screenId] — 화면 수정 */
export const PUT = withApiHandler(async ({ request, params }) => {
  await requireAuth();
  const body = (await request.json()) as UpsertSystemScreenDto;
  const data = await updateScreen(Number(params.screenId), body);

  return { data };
});

/** DELETE /api/admin/systems/screens/[screenId] — 화면 비활성화 */
export const DELETE = withApiHandler(async ({ params }) => {
  await requireAuth();
  await deactivateScreen(Number(params.screenId));

  return { data: { screenId: Number(params.screenId) } };
});
