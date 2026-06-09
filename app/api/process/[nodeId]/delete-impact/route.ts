import { requireAuth } from "@/lib/api/auth";
import { withApiHandler } from "@/lib/api/route-handler";
import { getProcessDeleteImpact } from "@/lib/services/process.service";

/** GET /api/process/[nodeId]/delete-impact — 삭제 영향 범위 조회 */
export const GET = withApiHandler(async ({ params }) => {
  await requireAuth();
  const nodeId = Number(params.nodeId);
  const data = await getProcessDeleteImpact(nodeId);
  return { data };
});
