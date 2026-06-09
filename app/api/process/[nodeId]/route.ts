import { requireAuth } from "@/lib/api/auth";
import { withApiHandler } from "@/lib/api/route-handler";
import {
  deleteProcess,
  getProcessDetail,
  updateProcess,
} from "@/lib/services/process.service";
import type { UpdateProcessDto } from "@/types/process";

/** GET /api/process/[nodeId] — 노드 상세 */
export const GET = withApiHandler(async ({ locale, params }) => {
  const nodeId = Number(params.nodeId);
  const data = await getProcessDetail(nodeId, locale);
  return { data };
});

/** PUT /api/process/[nodeId] — 노드 수정 */
export const PUT = withApiHandler(async ({ request, locale, params }) => {
  const auth = await requireAuth();
  const nodeId = Number(params.nodeId);
  const body = (await request.json()) as UpdateProcessDto;
  const data = await updateProcess(nodeId, body, locale, auth.userId);
  return { data };
});

/** DELETE /api/process/[nodeId] — 노드 삭제 */
export const DELETE = withApiHandler(async ({ request, params }) => {
  await requireAuth();
  const nodeId = Number(params.nodeId);
  const cascade = request.nextUrl.searchParams.get("cascade") === "true";
  await deleteProcess(nodeId, { cascade });
  return { data: { deleted: true } };
});
