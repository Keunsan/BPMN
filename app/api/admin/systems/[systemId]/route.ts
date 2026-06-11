import { requireAuth } from "@/lib/api/auth";
import { withApiHandler } from "@/lib/api/route-handler";
import {
  deactivateSystem,
  getSystem,
  updateSystem,
} from "@/lib/services/system.service";
import type { UpsertApplicationSystemDto } from "@/types/system";

/** GET /api/admin/systems/[systemId] — 시스템 상세 */
export const GET = withApiHandler(async ({ params }) => {
  const data = await getSystem(Number(params.systemId));
  return { data };
});

/** PUT /api/admin/systems/[systemId] — 시스템 수정 */
export const PUT = withApiHandler(async ({ request, params }) => {
  await requireAuth();
  const body = (await request.json()) as UpsertApplicationSystemDto;
  const data = await updateSystem(Number(params.systemId), body);

  return { data };
});

/** DELETE /api/admin/systems/[systemId] — 시스템 비활성화 */
export const DELETE = withApiHandler(async ({ params }) => {
  await requireAuth();
  await deactivateSystem(Number(params.systemId));

  return { data: { systemId: Number(params.systemId) } };
});
