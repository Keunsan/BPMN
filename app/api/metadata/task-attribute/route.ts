import { requireAuth } from "@/lib/api/auth";
import { withApiHandler } from "@/lib/api/route-handler";
import { upsertTaskAttribute } from "@/lib/services/metadata.service";
import type { UpsertTaskAttributeDto } from "@/types/metadata";

/** POST /api/metadata/task-attribute — Task 속성 생성 */
export const POST = withApiHandler(async ({ request, locale }) => {
  const auth = await requireAuth();
  const body = (await request.json()) as UpsertTaskAttributeDto;
  const data = await upsertTaskAttribute(body, locale, auth.userId);

  return { data, status: 201 };
});
