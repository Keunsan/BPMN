import { requireAuth } from "@/lib/api/auth";
import { withApiHandler } from "@/lib/api/route-handler";
import { createSystem, listSystems } from "@/lib/services/system.service";
import type { SystemListFilters, SystemType, UpsertApplicationSystemDto } from "@/types/system";

/** GET /api/admin/systems — 시스템 목록 */
export const GET = withApiHandler(async ({ request }) => {
  const { searchParams } = new URL(request.url);
  const isActiveParam = searchParams.get("isActive");
  const filters: SystemListFilters = {
    search: searchParams.get("search") ?? undefined,
    systemType: (searchParams.get("systemType") as SystemType | null) ?? undefined,
    isActive:
      isActiveParam === "true"
        ? true
        : isActiveParam === "false"
          ? false
          : undefined,
  };

  const data = await listSystems(filters);
  return { data };
});

/** POST /api/admin/systems — 시스템 생성 */
export const POST = withApiHandler(async ({ request }) => {
  await requireAuth();
  const body = (await request.json()) as UpsertApplicationSystemDto;
  const data = await createSystem(body);

  return { data, status: 201 };
});
