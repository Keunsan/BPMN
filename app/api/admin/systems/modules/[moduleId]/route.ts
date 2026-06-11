import { requireAuth } from "@/lib/api/auth";
import { withApiHandler } from "@/lib/api/route-handler";
import {
  deactivateModule,
  updateModule,
} from "@/lib/services/system.service";
import type { UpsertSystemModuleDto } from "@/types/system";

/** PUT /api/admin/systems/modules/[moduleId] — 모듈 수정 */
export const PUT = withApiHandler(async ({ request, params }) => {
  await requireAuth();
  const body = (await request.json()) as UpsertSystemModuleDto;
  const data = await updateModule(Number(params.moduleId), body);

  return { data };
});

/** DELETE /api/admin/systems/modules/[moduleId] — 모듈 비활성화 */
export const DELETE = withApiHandler(async ({ params }) => {
  await requireAuth();
  await deactivateModule(Number(params.moduleId));

  return { data: { moduleId: Number(params.moduleId) } };
});
