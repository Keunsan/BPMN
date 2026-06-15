import { requireAuth } from "@/lib/api/auth";
import { withApiHandler } from "@/lib/api/route-handler";
import {
  createE2eProcess,
  listE2eProcesses,
} from "@/lib/services/e2e-process.service";
import type {
  CreateE2eProcessDto,
  E2eProcessFilters,
  E2eProcessStatus,
} from "@/types/e2e-process";

/** GET /api/e2e-process — E2E 프로세스 목록 */
export const GET = withApiHandler(async ({ request }) => {
  const { searchParams } = request.nextUrl;
  const filters: E2eProcessFilters = {
    search: searchParams.get("search") ?? undefined,
    status: (searchParams.get("status") as E2eProcessStatus | null) ?? undefined,
  };
  const data = await listE2eProcesses(filters);
  return { data };
});

/** POST /api/e2e-process — E2E 프로세스 생성 */
export const POST = withApiHandler(async ({ request }) => {
  const auth = await requireAuth();
  const body = (await request.json()) as CreateE2eProcessDto;
  const data = await createE2eProcess(body, auth.userId);
  return { data, status: 201 };
});
