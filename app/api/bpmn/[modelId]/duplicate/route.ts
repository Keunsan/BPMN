import { requireAuth } from "@/lib/api/auth";
import { withApiHandler } from "@/lib/api/route-handler";
import { duplicateBpmnModel } from "@/lib/services/bpmn.service";

/** POST /api/bpmn/[modelId]/duplicate — 모델 복제 */
export const POST = withApiHandler(async ({ request, params }) => {
  const auth = await requireAuth();
  const modelId = Number(params.modelId);
  const body = (await request.json()) as { modelName: string };
  const data = await duplicateBpmnModel(modelId, body.modelName, auth.userId);
  return { data, status: 201 };
});

