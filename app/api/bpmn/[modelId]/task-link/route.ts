import { requireAuth } from "@/lib/api/auth";
import { withApiHandler } from "@/lib/api/route-handler";
import { linkOrCreateBpmnTaskProcess } from "@/lib/services/bpmn.service";
import type { LinkOrCreateBpmnTaskDto } from "@/types/bpmn";

/** POST /api/bpmn/[modelId]/task-link — BPMN Task를 L4 프로세스로 연결/생성 */
export const POST = withApiHandler(async ({ request, params }) => {
  const auth = await requireAuth();
  const modelId = Number(params.modelId);
  const body = (await request.json()) as LinkOrCreateBpmnTaskDto;
  const data = await linkOrCreateBpmnTaskProcess(modelId, body, auth.userId);

  return { data, status: 201 };
});
