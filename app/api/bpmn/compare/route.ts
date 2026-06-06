import { ApiError } from "@/lib/api/error-handler";

import { withApiHandler } from "@/lib/api/route-handler";

import { compareBpmnModels } from "@/lib/services/bpmn.service";

import type { BpmnCompareRequest } from "@/types/bpmn";



/** POST /api/bpmn/compare — 두 모델 버전 비교 */

export const POST = withApiHandler(async ({ request }) => {

  const body = (await request.json()) as BpmnCompareRequest;



  if (!body.leftModelId || !body.rightModelId) {

    throw new ApiError("E001", "leftModelId and rightModelId are required", 400);