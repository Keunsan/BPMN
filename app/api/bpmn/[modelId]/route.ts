import { requireAuth } from "@/lib/api/auth";
import { withApiHandler } from "@/lib/api/route-handler";
import {
  deleteBpmnModel,
  getBpmnModelDetail,
  getBpmnModelHistory,
  updateBpmnModel,
} from "@/lib/services/bpmn.service";

import type { UpdateBpmnDto } from "@/types/bpmn";



/** GET /api/bpmn/[modelId] — 모델 상세 또는 이력 */

export const GET = withApiHandler(async ({ request, params }) => {

  const modelId = Number(params.modelId);

  const format = request.nextUrl.searchParams.get("format");



  if (format === "history") {

    const detail = await getBpmnModelDetail(modelId);

    const data = await getBpmnModelHistory(detail.nodeId);

    return { data };

  }



  const data = await getBpmnModelDetail(modelId);

  return { data };

});



/** PUT /api/bpmn/[modelId] — 모델 저장 */

export const PUT = withApiHandler(async ({ request, params }) => {

  const auth = await requireAuth();

  const modelId = Number(params.modelId);

  const body = (await request.json()) as UpdateBpmnDto;

  const data = await updateBpmnModel(modelId, body, auth.userId);

  return { data };

});



/** DELETE /api/bpmn/[modelId] — 모델 삭제 */

export const DELETE = withApiHandler(async ({ params }) => {

  await requireAuth();

  const modelId = Number(params.modelId);

  await deleteBpmnModel(modelId);

  return { data: { deleted: true } };

});