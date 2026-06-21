import { requireAuth } from "@/lib/api/auth";
import { withApiHandler } from "@/lib/api/route-handler";
import { createRole, listRoles } from "@/lib/services/role.service";
import type { RoleCategory, UpsertRoleDto } from "@/types/role";

/** GET /api/admin/roles — 역할 목록 */
export const GET = withApiHandler(async ({ request }) => {
  const { searchParams } = new URL(request.url);
  const isActiveParam = searchParams.get("isActive");

  const data = await listRoles({
    search: searchParams.get("search") ?? undefined,
    roleCategory:
      (searchParams.get("roleCategory") as RoleCategory | null) ?? undefined,
    isActive:
      isActiveParam === "true"
        ? true
        : isActiveParam === "false"
          ? false
          : undefined,
  });

  return { data };
});

/** POST /api/admin/roles — 역할 생성 */
export const POST = withApiHandler(async ({ request }) => {
  await requireAuth();
  const body = (await request.json()) as UpsertRoleDto;
  const data = await createRole(body);

  return { data, status: 201 };
});
