import { requireAuth } from "@/lib/api/auth";
import { withApiHandler } from "@/lib/api/route-handler";
import {
  deactivateCommonCodeItem,
  getCommonCodeItem,
  updateCommonCodeItem,
} from "@/lib/services/common-code.service";
import type { UpsertCommonCodeItemDto } from "@/types/common-code";

/** GET /api/admin/codes/groups/[groupCode]/items/[code] — MINOR 코드 상세 */
export const GET = withApiHandler(async ({ locale, params }) => {
  const groupCode = params.groupCode as string;
  const code = params.code as string;
  const data = await getCommonCodeItem({ groupCode, code }, locale);
  return { data };
});

/** PUT /api/admin/codes/groups/[groupCode]/items/[code] — MINOR 코드 수정 */
export const PUT = withApiHandler(async ({ request, locale, params }) => {
  const auth = await requireAuth();
  const groupCode = params.groupCode as string;
  const code = params.code as string;
  const body = (await request.json()) as Partial<UpsertCommonCodeItemDto>;
  const data = await updateCommonCodeItem(
    { groupCode, code },
    body,
    locale,
    auth.userId,
  );

  return { data };
});

/** DELETE /api/admin/codes/groups/[groupCode]/items/[code] — MINOR 코드 비활성화 */
export const DELETE = withApiHandler(async ({ params }) => {
  const auth = await requireAuth();
  const groupCode = params.groupCode as string;
  const code = params.code as string;
  await deactivateCommonCodeItem({ groupCode, code }, auth.userId);

  return { data: { groupCode, code } };
});
