import { requireAuth } from "@/lib/api/auth";
import { getPaginationParams } from "@/lib/api/locale";
import { withApiHandler } from "@/lib/api/route-handler";
import {
  createProcess,
  getProcessTree,
  listProcesses,
} from "@/lib/services/process.service";
import type {
  CreateProcessDto,
  ProcessLevel,
  ProcessStatus,
} from "@/types/process";

/** GET /api/process — 트리 또는 flat 목록 */
export const GET = withApiHandler(async ({ request, locale }) => {
  const { searchParams } = request.nextUrl;
  const format = searchParams.get("format");
  const filters = {
    search: searchParams.get("search") ?? undefined,
    companyCode: searchParams.get("companyCode") ?? undefined,
    businessUnitCode: searchParams.get("businessUnitCode") ?? undefined,
    level: (searchParams.get("level") ?? undefined) as ProcessLevel | undefined,
    status: (searchParams.get("status") ?? undefined) as
      | ProcessStatus
      | undefined,
  };

  if (format === "tree") {
    const data = await getProcessTree(locale, filters);
    return { data };
  }

  const { page, limit } = getPaginationParams(request);
  const all = await listProcesses(locale, filters);
  const start = (page - 1) * limit;
  const items = all.slice(start, start + limit);

  return {
    data: items,
    meta: { page, limit, total: all.length },
  };
});

/** POST /api/process — 노드 생성 */
export const POST = withApiHandler(async ({ request, locale }) => {
  const auth = await requireAuth();
  const body = (await request.json()) as CreateProcessDto;
  const data = await createProcess(body, locale, auth.userId);
  return { data, status: 201 };
});
