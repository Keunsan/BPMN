import { requireAuth } from "@/lib/api/auth";
import { withApiHandler } from "@/lib/api/route-handler";
import { ensureE2eBpmnModel } from "@/lib/services/bpmn.service";

/** POST /api/e2e-process/[id]/bpmn — E2E BPMN 모델 확보(없으면 생성) */
export const POST = withApiHandler(async ({ params }) => {
  const auth = await requireAuth();
  const e2eProcessId = Number(params.id);
  const modelId = await ensureE2eBpmnModel(e2eProcessId, auth.userId);
  return { data: { modelId } };
});
