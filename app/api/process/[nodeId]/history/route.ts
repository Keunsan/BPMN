import { withApiHandler } from "@/lib/api/route-handler";
import { getProcessHistory } from "@/lib/services/process.service";

/** GET /api/process/[nodeId]/history — 버전 이력 */
export const GET = withApiHandler(async ({ params }) => {
  const nodeId = Number(params.nodeId);
  const data = await getProcessHistory(nodeId);
  return { data };
});
