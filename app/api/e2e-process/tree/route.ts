import { withApiHandler } from "@/lib/api/route-handler";
import { listE2eProcessesForTree } from "@/lib/services/e2e-process.service";

/** GET /api/e2e-process/tree — 프로세스 맵 E2E 섹션용 flat list */
export const GET = withApiHandler(async () => {
  const data = await listE2eProcessesForTree();
  return { data };
});
