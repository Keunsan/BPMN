import { withApiHandler } from "@/lib/api/route-handler";
import { listE2eProcessesByL3NodeId } from "@/lib/services/e2e-process.service";

/** GET /api/e2e-process/by-l3/[nodeId] — L3를 Call하는 E2E 역참조 */
export const GET = withApiHandler(async ({ params }) => {
  const nodeId = Number(params.nodeId);
  const data = await listE2eProcessesByL3NodeId(nodeId);
  return { data };
});
