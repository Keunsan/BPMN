import { requireAuth } from "@/lib/api/auth";
import { withApiHandler } from "@/lib/api/route-handler";
import {
  deactivateCommonCodeItem,
  getCommonCodeItem,
  updateCommonCodeItem,
} from "@/lib/services/common-code.service";
import type { UpsertCommonCodeItemDto } from "@/types/common-code";

/** GET /api/admin/codes/items/[codeId] — MINOR 코드 상세 */
export const GET = withApiHandler(async ({ locale, params }) => {
  const codeId = Number(params.codeId);
  const data = await getCommonCodeItem(codeId, locale);
  return { data };
});

/** PUT /api/admin/codes/items/[codeId] — MINOR 코드 수정 */
export const PUT = withApiHandler(async ({ request, locale, params }) => {
  const auth = await requireAuth();
  const codeId = Number(params.codeId);
  const body = (await request.json()) as Partial<UpsertCommonCodeItemDto>;
  const data = await updateCommonCodeItem(codeId, body, locale, auth.userId);

  return { data };
});

/** DELETE /api/admin/codes/items/[codeId] — MINOR 코드 비활성화 */
export const DELETE = withApiHandler(async ({ params }) => {
  const auth = await requireAuth();
  const codeId = Number(params.codeId);
  await deactivateCommonCodeItem(codeId, auth.userId);

  return { data: { codeId } };
});
