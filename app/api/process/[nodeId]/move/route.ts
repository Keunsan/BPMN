import { requireAuth } from "@/lib/api/auth";
import { withApiHandler } from "@/lib/api/route-handler";
import { moveProcess } from "@/lib/services/process.service";
import type { MoveProcessDto } from "@/types/process";

/** PUT /api/process/[nodeId]/move — 노드 이동 */
export const PUT = withApiHandler(async ({ request, locale, params }) => {
  await requireAuth();
  const nodeId = Number(params.nodeId);
  const body = (await request.json()) as MoveProcessDto;
  const data = await moveProcess(nodeId, body, locale);
  return { data };
});
