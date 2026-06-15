import { requireAuth } from "@/lib/api/auth";
import { withApiHandler } from "@/lib/api/route-handler";
import { createBpmnModel, listBpmnModels } from "@/lib/services/bpmn.service";

import type { BpmnFilters, BpmnModelStatus, CreateBpmnDto } from "@/types/bpmn";



/** GET /api/bpmn — 모델 목록 */

export const GET = withApiHandler(async ({ request }) => {

  const { searchParams } = request.nextUrl;



  const filters: BpmnFilters = {

    nodeId: searchParams.get("nodeId")

      ? Number(searchParams.get("nodeId"))

      : undefined,

    linkedNodeId: searchParams.get("linkedNodeId")

      ? Number(searchParams.get("linkedNodeId"))

      : undefined,

    status: (searchParams.get("status") as BpmnModelStatus | null) ?? undefined,

    isCurrent:

      searchParams.get("isCurrent") === "true"

        ? true

        : searchParams.get("isCurrent") === "false"

          ? false

          : undefined,

    companyCode: searchParams.get("companyCode") ?? undefined,

    businessUnitCode: searchParams.get("businessUnitCode") ?? undefined,

    search: searchParams.get("search") ?? undefined,

    sort: (searchParams.get("sort") as BpmnFilters["sort"]) ?? "updated",

  };



  const data = await listBpmnModels(filters);

  return { data };

});



/** POST /api/bpmn — 모델 생성 */

export const POST = withApiHandler(async ({ request }) => {

  const auth = await requireAuth();

  const body = (await request.json()) as CreateBpmnDto;

  const data = await createBpmnModel(body, auth.userId);

  return { data, status: 201 };

});