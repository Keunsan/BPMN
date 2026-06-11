import { requireAuth } from "@/lib/api/auth";
import { withApiHandler } from "@/lib/api/route-handler";
import { deleteTaskSystemMapping } from "@/lib/services/system.service";

/** DELETE /api/metadata/tasks/[nodeId]/systems/[mappingId] — Task 시스템 매핑 삭제 */
export const DELETE = withApiHandler(async ({ params }) => {
  await requireAuth();
  await deleteTaskSystemMapping(Number(params.nodeId), Number(params.mappingId));

  return { data: { mappingId: Number(params.mappingId) } };
});
