import { requireAuth } from "@/lib/api/auth";
import { withApiHandler } from "@/lib/api/route-handler";
import { syncOrganizationsFromHr } from "@/lib/services/organization.service";

/** POST /api/admin/organizations/sync — HR ERP 조직 동기화 */
export const POST = withApiHandler(async () => {
  await requireAuth();
  const data = await syncOrganizationsFromHr();
  return { data };
});
