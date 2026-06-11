import { requireAuth } from "@/lib/api/auth";
import { withApiHandler } from "@/lib/api/route-handler";
import {
  createTaskDataTableLink,
  listTaskDataTableLinks,
} from "@/lib/services/data-table.service";
import type { UpsertTaskDataTableLinkDto } from "@/types/data-table";

/** GET /api/metadata/tasks/[nodeId]/data-tables — Task 데이터 테이블 연결 목록 */
export const GET = withApiHandler(async ({ params }) => {
  const data = await listTaskDataTableLinks(Number(params.nodeId));
  return { data };
});

/** POST /api/metadata/tasks/[nodeId]/data-tables — Task 데이터 테이블 연결 생성 */
export const POST = withApiHandler(async ({ request, params }) => {
  const auth = await requireAuth();
  const body = (await request.json()) as UpsertTaskDataTableLinkDto;
  const data = await createTaskDataTableLink(
    { ...body, nodeId: Number(params.nodeId) },
    auth.userId,
  );

  return { data, status: 201 };
});
