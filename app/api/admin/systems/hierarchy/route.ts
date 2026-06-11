import { withApiHandler } from "@/lib/api/route-handler";
import { listSystemHierarchy } from "@/lib/services/system.service";

/** GET /api/admin/systems/hierarchy — 활성 시스템 계층 */
export const GET = withApiHandler(async () => {
  const data = await listSystemHierarchy();
  return { data };
});
