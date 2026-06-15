import { requireAuth } from "@/lib/api/auth";
import { withApiHandler } from "@/lib/api/route-handler";
import { createTaskSystemScreenLinksBatch } from "@/lib/services/system.service";
import type { BatchCreateTaskSystemScreenLinkDto } from "@/types/system";

/** POST /api/metadata/tasks/[nodeId]/systems/[linkId]/screens/batch — Task 시스템 2차 화면 일괄 연결 */
export const POST = withApiHandler(async ({ request, params }) => {
  await requireAuth();
  const body = (await request.json()) as BatchCreateTaskSystemScreenLinkDto;
  const data = await createTaskSystemScreenLinksBatch(
    Number(params.nodeId),
    Number(params.linkId),
    body,
  );

  return { data, status: 201 };
});
