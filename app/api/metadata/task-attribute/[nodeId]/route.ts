import { requireAuth } from "@/lib/api/auth";
import { withApiHandler } from "@/lib/api/route-handler";
import {
  getTaskAttribute,
  upsertTaskAttribute,
} from "@/lib/services/metadata.service";
import type { UpsertTaskAttributeDto } from "@/types/metadata";

/** GET /api/metadata/task-attribute/[nodeId] — Task 속성 조회 */
export const GET = withApiHandler(async ({ locale, params }) => {
  const nodeId = Number(params.nodeId);
  const data = await getTaskAttribute(nodeId, locale);

  return { data };
});

/** PUT /api/metadata/task-attribute/[nodeId] — Task 속성 수정 */
export const PUT = withApiHandler(async ({ request, locale, params }) => {
  const auth = await requireAuth();
  const nodeId = Number(params.nodeId);
  const body = (await request.json()) as UpsertTaskAttributeDto;
  const data = await upsertTaskAttribute(
    { ...body, nodeId },
    locale,
    auth.userId,
  );

  return { data };
});
