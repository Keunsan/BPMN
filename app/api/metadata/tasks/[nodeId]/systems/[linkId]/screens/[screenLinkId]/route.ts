import { requireAuth } from "@/lib/api/auth";
import { withApiHandler } from "@/lib/api/route-handler";
import { deleteTaskSystemScreenLink } from "@/lib/services/system.service";

/** DELETE /api/metadata/tasks/[nodeId]/systems/[linkId]/screens/[screenLinkId] — Task 시스템 2차 화면 연결 삭제 */
export const DELETE = withApiHandler(async ({ params }) => {
  await requireAuth();
  await deleteTaskSystemScreenLink(
    Number(params.nodeId),
    Number(params.linkId),
    Number(params.screenLinkId),
  );

  return { data: { screenLinkId: Number(params.screenLinkId) } };
});
