import { requireAuth } from "@/lib/api/auth";
import { withApiHandler } from "@/lib/api/route-handler";
import { createVariantFromStandard } from "@/lib/services/process.service";
import type { CreateVariantDto } from "@/types/process";

/** POST /api/process/[nodeId]/variant — 표준 프로세스 변형 생성 */
export const POST = withApiHandler(async ({ request, locale, params }) => {
  const auth = await requireAuth();
  const nodeId = Number(params.nodeId);
  const body = (await request.json()) as CreateVariantDto;
  const data = await createVariantFromStandard(
    nodeId,
    body,
    locale,
    auth.userId,
  );
  return { data, status: 201 };
});
