import { requireAuth } from "@/lib/api/auth";
import { withApiHandler } from "@/lib/api/route-handler";
import {
  createTaskSystemMapping,
  listTaskSystemMappings,
} from "@/lib/services/system.service";
import type { CreateTaskSystemMappingDto } from "@/types/system";

/** GET /api/metadata/tasks/[nodeId]/systems — Task 시스템 매핑 목록 */
export const GET = withApiHandler(async ({ params, locale }) => {
  const data = await listTaskSystemMappings(Number(params.nodeId), locale);
  return { data };
});

/** POST /api/metadata/tasks/[nodeId]/systems — Task 시스템 매핑 생성 */
export const POST = withApiHandler(async ({ request, params }) => {
  const auth = await requireAuth();
  const body = (await request.json()) as CreateTaskSystemMappingDto;
  const data = await createTaskSystemMapping(
    { ...body, nodeId: Number(params.nodeId) },
    auth.userId,
  );

  return { data, status: 201 };
});
