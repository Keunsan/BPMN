import { withApiHandler } from "@/lib/api/route-handler";
import { compareStandardVariant } from "@/lib/services/process.service";

/** GET /api/process/[nodeId]/compare-variant — 표준·변형 비교 */
export const GET = withApiHandler(async ({ request, locale, params }) => {
  const nodeId = Number(params.nodeId);
  const { searchParams } = request.nextUrl;
  const companyCode = searchParams.get("companyCode") ?? "";
  const businessUnitCode = searchParams.get("businessUnitCode") ?? "";
  const data = await compareStandardVariant(
    nodeId,
    companyCode,
    businessUnitCode,
    locale,
  );
  return { data };
});
