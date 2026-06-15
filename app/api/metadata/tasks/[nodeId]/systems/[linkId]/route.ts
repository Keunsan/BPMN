import { requireAuth } from "@/lib/api/auth";
import { withApiHandler } from "@/lib/api/route-handler";
import {
  deleteTaskSystemLink,
  updateTaskSystemLink,
} from "@/lib/services/system.service";
import type { UpdateTaskSystemLinkDto } from "@/types/system";

/** DELETE /api/metadata/tasks/[nodeId]/systems/[linkId] — Task 시스템 1차 연결 삭제 */
export const DELETE = withApiHandler(async ({ params }) => {
  await requireAuth();
  await deleteTaskSystemLink(Number(params.nodeId), Number(params.linkId));

  return { data: { linkId: Number(params.linkId) } };
});

/** PATCH /api/metadata/tasks/[nodeId]/systems/[linkId] — Task 시스템 1차 연결 수정 */
export const PATCH = withApiHandler(async ({ request, params }) => {
  await requireAuth();
  const body = (await request.json()) as UpdateTaskSystemLinkDto;
  const data = await updateTaskSystemLink(
    Number(params.nodeId),
    Number(params.linkId),
    body,
  );

  return { data };
});
