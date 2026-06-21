import { requireAuth } from "@/lib/api/auth";
import { withApiHandler } from "@/lib/api/route-handler";
import { deactivateRole, updateRole } from "@/lib/services/role.service";
import type { UpsertRoleDto } from "@/types/role";

/** PUT /api/admin/roles/[roleId] — 역할 수정 */
export const PUT = withApiHandler(async ({ request, params }) => {
  await requireAuth();
  const body = (await request.json()) as UpsertRoleDto;
  const data = await updateRole(Number(params.roleId), body);

  return { data };
});

/** DELETE /api/admin/roles/[roleId] — 역할 비활성화 */
export const DELETE = withApiHandler(async ({ params }) => {
  await requireAuth();
  await deactivateRole(Number(params.roleId));

  return { data: { success: true } };
});
