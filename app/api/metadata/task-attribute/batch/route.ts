import { requireAuth } from "@/lib/api/auth";
import { withApiHandler } from "@/lib/api/route-handler";
import { batchUpsertTaskAttributes } from "@/lib/services/metadata.service";
import type { TaskAttributeBatchRequest } from "@/types/editable-data-grid";

/**
 * PATCH /api/metadata/task-attribute/batch
 * TODO: 백엔드 계약 확정 시 요청·응답 스키마 동기화
 */
export const PATCH = withApiHandler(async ({ request, locale }) => {
  const auth = await requireAuth();
  const body = (await request.json()) as TaskAttributeBatchRequest;
  const data = await batchUpsertTaskAttributes(body, locale, auth.userId);
  return { data };
});
