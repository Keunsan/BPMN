import { requireAuth } from "@/lib/api/auth";
import { withApiHandler } from "@/lib/api/route-handler";
import {
  createCommonCodeItem,
  listCommonCodeItems,
} from "@/lib/services/common-code.service";
import type {
  CommonCodeItemListFilters,
  UpsertCommonCodeItemDto,
} from "@/types/common-code";

/** GET /api/admin/codes/groups/[groupId]/items — MINOR 코드 목록 */
export const GET = withApiHandler(async ({ request, locale, params }) => {
  const groupId = Number(params.groupId);
  const { searchParams } = new URL(request.url);
  const isActiveParam = searchParams.get("isActive");

  const filters: CommonCodeItemListFilters = {
    search: searchParams.get("search") ?? undefined,
    isActive:
      isActiveParam === "true"
        ? true
        : isActiveParam === "false"
          ? false
          : undefined,
  };

  const data = await listCommonCodeItems(groupId, locale, filters);
  return { data };
});

/** POST /api/admin/codes/groups/[groupId]/items — MINOR 코드 생성 */
export const POST = withApiHandler(async ({ request, locale, params }) => {
  const auth = await requireAuth();
  const groupId = Number(params.groupId);
  const body = (await request.json()) as UpsertCommonCodeItemDto;
  const data = await createCommonCodeItem(
    { ...body, groupId },
    locale,
    auth.userId,
  );

  return { data, status: 201 };
});
