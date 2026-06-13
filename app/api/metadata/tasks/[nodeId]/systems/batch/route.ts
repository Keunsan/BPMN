import { requireAuth } from "@/lib/api/auth";
import { withApiHandler } from "@/lib/api/route-handler";
import { createTaskSystemMappingsBatch } from "@/lib/services/system.service";
import type { BatchCreateTaskSystemMappingDto } from "@/types/system";

/** POST /api/metadata/tasks/[nodeId]/systems/batch — Task-시스템 매핑 일괄 생성 */
export const POST = withApiHandler(async ({ request, params }) => {
  const auth = await requireAuth();
  const body = (await request.json()) as BatchCreateTaskSystemMappingDto;
  const data = await createTaskSystemMappingsBatch(
    Number(params.nodeId),
    body,
    auth.userId,
  );

  return { data, status: 201 };
});
