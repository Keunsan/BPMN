import { requireAuth } from "@/lib/api/auth";
import { withApiHandler } from "@/lib/api/route-handler";
import { createScreen, listScreens } from "@/lib/services/system.service";
import type { UpsertSystemScreenDto } from "@/types/system";

/** GET /api/admin/systems/[systemId]/screens — 화면 목록 */
export const GET = withApiHandler(async ({ params, locale, request }) => {
  const url = new URL(request.url);
  const moduleCode = url.searchParams.get("moduleCode") ?? undefined;
  const isActiveParam = url.searchParams.get("isActive");
  const isActive =
    isActiveParam === null ? undefined : isActiveParam === "true";

  const data = await listScreens(
    Number(params.systemId),
    { moduleCode, isActive },
    locale,
  );

  return { data };
});

/** POST /api/admin/systems/[systemId]/screens — 화면 생성 */
export const POST = withApiHandler(async ({ request, params }) => {
  await requireAuth();
  const body = (await request.json()) as UpsertSystemScreenDto;
  const data = await createScreen({
    ...body,
    systemId: Number(params.systemId),
  });

  return { data, status: 201 };
});
