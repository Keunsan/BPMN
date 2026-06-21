import { requireAuth } from "@/lib/api/auth";
import { withApiHandler } from "@/lib/api/route-handler";
import {
  createTaskRoleMapping,
  listTaskRoleMappings,
} from "@/lib/services/raci.service";
import type { UpsertTaskRoleMappingDto } from "@/types/raci";

/** GET /api/metadata/tasks/[nodeId]/raci — Task RACI 매핑 목록 */
export const GET = withApiHandler(async ({ params }) => {
  const data = await listTaskRoleMappings(Number(params.nodeId));
  return { data };
});

/** POST /api/metadata/tasks/[nodeId]/raci — Task RACI 매핑 생성 */
export const POST = withApiHandler(async ({ request, params }) => {
  const auth = await requireAuth();
  const body = (await request.json()) as UpsertTaskRoleMappingDto;
  const data = await createTaskRoleMapping(
    { ...body, nodeId: Number(params.nodeId) },
    auth.userId,
  );

  return { data, status: 201 };
});
