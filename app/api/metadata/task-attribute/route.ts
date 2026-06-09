import { requireAuth } from "@/lib/api/auth";
import { withApiHandler } from "@/lib/api/route-handler";
import {
  listTaskAttributes,
  upsertTaskAttribute,
} from "@/lib/services/metadata.service";
import type {
  TaskAttributeListFilters,
  UpsertTaskAttributeDto,
} from "@/types/metadata";

/** GET /api/metadata/task-attribute — Task 속성 목록 */
export const GET = withApiHandler(async ({ request, locale }) => {
  const { searchParams } = new URL(request.url);
  const filters: TaskAttributeListFilters = {
    search: searchParams.get("search") ?? undefined,
    level:
      searchParams.get("level") === "L3" || searchParams.get("level") === "L4"
        ? searchParams.get("level")
        : undefined,
  };

  const data = await listTaskAttributes(locale, filters);
  return { data };
});

/** POST /api/metadata/task-attribute — Task 속성 생성 */
export const POST = withApiHandler(async ({ request, locale }) => {
  const auth = await requireAuth();
  const body = (await request.json()) as UpsertTaskAttributeDto;
  const data = await upsertTaskAttribute(body, locale, auth.userId);

  return { data, status: 201 };
});
