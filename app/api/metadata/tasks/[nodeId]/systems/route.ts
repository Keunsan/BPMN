import { requireAuth } from "@/lib/api/auth";
import { withApiHandler } from "@/lib/api/route-handler";
import {
  createTaskSystemLinksBatch,
  listTaskSystemLinks,
} from "@/lib/services/system.service";
import type { BatchCreateTaskSystemLinkDto } from "@/types/system";

/** GET /api/metadata/tasks/[nodeId]/systems — Task 시스템 1차 연결 목록 */
export const GET = withApiHandler(async ({ params, locale, request }) => {
  const url = new URL(request.url);
  const includeScreens = url.searchParams.get("includeScreens") !== "false";

  const data = await listTaskSystemLinks(
    Number(params.nodeId),
    locale,
    { includeScreens },
  );
  return { data };
});

/** POST /api/metadata/tasks/[nodeId]/systems — Task 시스템 1차 연결 일괄 생성 */
export const POST = withApiHandler(async ({ request, params }) => {
  const auth = await requireAuth();
  const body = (await request.json()) as BatchCreateTaskSystemLinkDto;
  const data = await createTaskSystemLinksBatch(
    Number(params.nodeId),
    body,
    auth.userId,
  );

  return { data, status: 201 };
});
