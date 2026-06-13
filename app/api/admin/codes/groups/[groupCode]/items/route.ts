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

/** GET /api/admin/codes/groups/[groupCode]/items — MINOR 코드 목록 */
export const GET = withApiHandler(async ({ request, locale, params }) => {
  const groupCode = params.groupCode as string;
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

  const data = await listCommonCodeItems(groupCode, locale, filters);
  return { data };
});

/** POST /api/admin/codes/groups/[groupCode]/items — MINOR 코드 생성 */
export const POST = withApiHandler(async ({ request, locale, params }) => {
  const auth = await requireAuth();
  const groupCode = params.groupCode as string;
  const body = (await request.json()) as UpsertCommonCodeItemDto;
  const data = await createCommonCodeItem(
    { ...body, groupCode },
    locale,
    auth.userId,
  );

  return { data, status: 201 };
});
