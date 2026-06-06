import { requireAuth } from "@/lib/api/auth";
import { withApiHandler } from "@/lib/api/route-handler";
import { requestApproval } from "@/lib/services/process.service";

/** POST /api/process/[nodeId]/approve — 승인 요청 */
export const POST = withApiHandler(async ({ request, params }) => {
  const auth = await requireAuth();
  const nodeId = Number(params.nodeId);
  const body = (await request.json()) as { comment?: string };
  const data = await requestApproval(nodeId, auth.userId, body.comment);
  return { data, status: 201 };
});
