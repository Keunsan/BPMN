import { requireAuth } from "@/lib/api/auth";
import { withApiHandler } from "@/lib/api/route-handler";
import {
  deactivateCommonCodeGroup,
  getCommonCodeGroup,
  updateCommonCodeGroup,
} from "@/lib/services/common-code.service";
import type { UpsertCommonCodeGroupDto } from "@/types/common-code";

/** GET /api/admin/codes/groups/[groupCode] — MAJOR 코드 그룹 상세 */
export const GET = withApiHandler(async ({ locale, params }) => {
  const groupCode = params.groupCode as string;
  const data = await getCommonCodeGroup(groupCode, locale);
  return { data };
});

/** PUT /api/admin/codes/groups/[groupCode] — MAJOR 코드 그룹 수정 */
export const PUT = withApiHandler(async ({ request, locale, params }) => {
  const auth = await requireAuth();
  const groupCode = params.groupCode as string;
  const body = (await request.json()) as Partial<UpsertCommonCodeGroupDto>;
  const data = await updateCommonCodeGroup(groupCode, body, locale, auth.userId);

  return { data };
});

/** DELETE /api/admin/codes/groups/[groupCode] — MAJOR 코드 그룹 비활성화 */
export const DELETE = withApiHandler(async ({ params }) => {
  const auth = await requireAuth();
  const groupCode = params.groupCode as string;
  await deactivateCommonCodeGroup(groupCode, auth.userId);

  return { data: { groupCode } };
});
