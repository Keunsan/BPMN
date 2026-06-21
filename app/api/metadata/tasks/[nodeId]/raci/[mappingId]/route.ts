import { requireAuth } from "@/lib/api/auth";
import { withApiHandler } from "@/lib/api/route-handler";
import {
  deleteTaskRoleMapping,
  updateTaskRoleMapping,
} from "@/lib/services/raci.service";
import type { UpsertTaskRoleMappingDto } from "@/types/raci";

/** PUT /api/metadata/tasks/[nodeId]/raci/[mappingId] — Task RACI 매핑 수정 */
export const PUT = withApiHandler(async ({ request, params }) => {
  const auth = await requireAuth();
  const body = (await request.json()) as UpsertTaskRoleMappingDto;
  const data = await updateTaskRoleMapping(
    Number(params.mappingId),
    { ...body, nodeId: Number(params.nodeId) },
    auth.userId,
  );

  return { data };
});

/** DELETE /api/metadata/tasks/[nodeId]/raci/[mappingId] — Task RACI 매핑 삭제 */
export const DELETE = withApiHandler(async ({ params }) => {
  await requireAuth();
  await deleteTaskRoleMapping(
    Number(params.nodeId),
    Number(params.mappingId),
  );

  return { data: { success: true } };
});
