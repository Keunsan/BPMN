import { requireAuth } from "@/lib/api/auth";
import { withApiHandler } from "@/lib/api/route-handler";
import {
  deleteE2eProcess,
  getE2eProcessDetail,
  updateE2eProcess,
} from "@/lib/services/e2e-process.service";
import type { UpdateE2eProcessDto } from "@/types/e2e-process";

/** GET /api/e2e-process/[id] — E2E 프로세스 상세 */
export const GET = withApiHandler(async ({ params }) => {
  const e2eProcessId = Number(params.id);
  const data = await getE2eProcessDetail(e2eProcessId);
  return { data };
});

/** PUT /api/e2e-process/[id] — E2E 프로세스 수정 */
export const PUT = withApiHandler(async ({ request, params }) => {
  const auth = await requireAuth();
  const e2eProcessId = Number(params.id);
  const body = (await request.json()) as UpdateE2eProcessDto;
  const data = await updateE2eProcess(e2eProcessId, body, auth.userId);
  return { data };
});

/** DELETE /api/e2e-process/[id] — E2E 프로세스 삭제 */
export const DELETE = withApiHandler(async ({ params }) => {
  await requireAuth();
  const e2eProcessId = Number(params.id);
  await deleteE2eProcess(e2eProcessId);
  return { data: { deleted: true } };
});
