import { requireAuth } from "@/lib/api/auth";
import { withApiHandler } from "@/lib/api/route-handler";
import {
  deactivateCommonCodeGroup,
  getCommonCodeGroup,
  updateCommonCodeGroup,
} from "@/lib/services/common-code.service";
import type { UpsertCommonCodeGroupDto } from "@/types/common-code";

/** GET /api/admin/codes/groups/[groupId] — MAJOR 코드 그룹 상세 */
export const GET = withApiHandler(async ({ locale, params }) => {
  const groupId = Number(params.groupId);
  const data = await getCommonCodeGroup(groupId, locale);
  return { data };
});

/** PUT /api/admin/codes/groups/[groupId] — MAJOR 코드 그룹 수정 */
export const PUT = withApiHandler(async ({ request, locale, params }) => {
  const auth = await requireAuth();
  const groupId = Number(params.groupId);
  const body = (await request.json()) as Partial<UpsertCommonCodeGroupDto>;
  const data = await updateCommonCodeGroup(groupId, body, locale, auth.userId);

  return { data };
});

/** DELETE /api/admin/codes/groups/[groupId] — MAJOR 코드 그룹 비활성화 */
export const DELETE = withApiHandler(async ({ params }) => {
  const auth = await requireAuth();
  const groupId = Number(params.groupId);
  await deactivateCommonCodeGroup(groupId, auth.userId);

  return { data: { groupId } };
});
