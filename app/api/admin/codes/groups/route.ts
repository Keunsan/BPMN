import { requireAuth } from "@/lib/api/auth";
import { withApiHandler } from "@/lib/api/route-handler";
import {
  createCommonCodeGroup,
  listCommonCodeGroups,
} from "@/lib/services/common-code.service";
import type {
  CommonCodeGroupListFilters,
  UpsertCommonCodeGroupDto,
} from "@/types/common-code";

/** GET /api/admin/codes/groups — MAJOR 코드 그룹 목록 */
export const GET = withApiHandler(async ({ request, locale }) => {
  const { searchParams } = new URL(request.url);
  const isActiveParam = searchParams.get("isActive");

  const filters: CommonCodeGroupListFilters = {
    search: searchParams.get("search") ?? undefined,
    isActive:
      isActiveParam === "true"
        ? true
        : isActiveParam === "false"
          ? false
          : undefined,
  };

  const data = await listCommonCodeGroups(locale, filters);
  return { data };
});

/** POST /api/admin/codes/groups — MAJOR 코드 그룹 생성 */
export const POST = withApiHandler(async ({ request, locale }) => {
  const auth = await requireAuth();
  const body = (await request.json()) as UpsertCommonCodeGroupDto;
  const data = await createCommonCodeGroup(body, locale, auth.userId);

  return { data, status: 201 };
});
