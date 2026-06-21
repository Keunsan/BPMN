import { withApiHandler } from "@/lib/api/route-handler";
import { listOrganizations } from "@/lib/services/organization.service";

/** GET /api/admin/organizations — 조직 목록 */
export const GET = withApiHandler(async ({ request }) => {
  const { searchParams } = new URL(request.url);
  const isActiveParam = searchParams.get("isActive");
  const leafOnlyParam = searchParams.get("leafOnly");

  const data = await listOrganizations({
    search: searchParams.get("search") ?? undefined,
    buCd: searchParams.get("buCd") ?? undefined,
    isActive:
      isActiveParam === "true"
        ? true
        : isActiveParam === "false"
          ? false
          : undefined,
    leafOnly: leafOnlyParam === "true",
  });

  return { data };
});
