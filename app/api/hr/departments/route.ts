import { withApiHandler } from "@/lib/api/route-handler";
import { listHrDepartments } from "@/lib/services/organization.service";

/** GET /api/hr/departments — HR ERP 부서 live 조회 */
export const GET = withApiHandler(async () => {
  const data = await listHrDepartments();
  return { data };
});
