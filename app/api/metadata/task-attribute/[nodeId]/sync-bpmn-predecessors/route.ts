import { requireAuth } from "@/lib/api/auth";
import { withApiHandler } from "@/lib/api/route-handler";
import { syncTaskAttributeBpmnPredecessors } from "@/lib/services/metadata.service";

/** POST /api/metadata/task-attribute/[nodeId]/sync-bpmn-predecessors — BPMN 선행 프로세스를 DB에 동기화 */
export const POST = withApiHandler(async ({ locale, params }) => {
  await requireAuth();
  const nodeId = Number(params.nodeId);
  const predecessors = await syncTaskAttributeBpmnPredecessors(nodeId, locale);

  return { data: { predecessors } };
});
