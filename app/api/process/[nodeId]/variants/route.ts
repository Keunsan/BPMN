import { withApiHandler } from "@/lib/api/route-handler";
import { listVariantsByStandard } from "@/lib/services/process.service";

/** GET /api/process/[nodeId]/variants — 표준 프로세스 변형 목록 */
export const GET = withApiHandler(async ({ locale, params }) => {
  const nodeId = Number(params.nodeId);
  const data = await listVariantsByStandard(nodeId, locale);
  return { data };
});
