import { requireAuth } from "@/lib/api/auth";
import { withApiHandler } from "@/lib/api/route-handler";
import { syncBpmnModelTaskPredecessors } from "@/lib/services/bpmn.service";
import type { BpmnElementLinkDto } from "@/types/bpmn";

type SyncBpmnPredecessorsDto = {
  bpmnXml?: string | null;
  elements?: BpmnElementLinkDto[];
};

/** POST /api/bpmn/[modelId]/sync-predecessors — BPMN 선행 프로세스를 task_predecessor에 저장 */
export const POST = withApiHandler(async ({ request, params }) => {
  await requireAuth();
  const modelId = Number(params.modelId);
  const body = (await request.json().catch(() => ({}))) as SyncBpmnPredecessorsDto;

  await syncBpmnModelTaskPredecessors(modelId, {
    bpmnXml: body.bpmnXml,
    elements: body.elements,
  });

  return { data: { synced: true } };
});
