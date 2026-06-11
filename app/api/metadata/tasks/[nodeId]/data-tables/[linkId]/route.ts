import { requireAuth } from "@/lib/api/auth";
import { withApiHandler } from "@/lib/api/route-handler";
import {
  deleteTaskDataTableLink,
  updateTaskDataTableLink,
} from "@/lib/services/data-table.service";
import type { UpsertTaskDataTableLinkDto } from "@/types/data-table";

/** PUT /api/metadata/tasks/[nodeId]/data-tables/[linkId] — Task 데이터 테이블 연결 수정 */
export const PUT = withApiHandler(async ({ request, params }) => {
  const auth = await requireAuth();
  const body = (await request.json()) as UpsertTaskDataTableLinkDto;
  const data = await updateTaskDataTableLink(
    Number(params.linkId),
    { ...body, nodeId: Number(params.nodeId) },
    auth.userId,
  );

  return { data };
});

/** DELETE /api/metadata/tasks/[nodeId]/data-tables/[linkId] — Task 데이터 테이블 연결 삭제 */
export const DELETE = withApiHandler(async ({ params }) => {
  await requireAuth();
  await deleteTaskDataTableLink(Number(params.nodeId), Number(params.linkId));

  return { data: { linkId: Number(params.linkId) } };
});
