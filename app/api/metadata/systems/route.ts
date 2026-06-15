import { withApiHandler } from "@/lib/api/route-handler";
import { listSystemCatalog } from "@/lib/services/system.service";
import type { SystemCatalogFilters } from "@/types/system";

/** GET /api/metadata/systems — 연결 후보 시스템 카탈로그 */
export const GET = withApiHandler(async ({ locale, request }) => {
  const url = new URL(request.url);
  const search = url.searchParams.get("search") ?? undefined;
  const companyCode = url.searchParams.get("companyCode") ?? undefined;
  const businessUnitCode = url.searchParams.get("businessUnitCode") ?? undefined;
  const excludeNodeId = url.searchParams.get("excludeNodeId");
  const page = url.searchParams.get("page");
  const pageSize = url.searchParams.get("pageSize");

  const filters: SystemCatalogFilters = {
    search,
    companyCode,
    businessUnitCode,
    excludeNodeId: excludeNodeId ? Number(excludeNodeId) : undefined,
    page: page ? Number(page) : 1,
    pageSize: pageSize ? Number(pageSize) : 50,
  };

  const { items, total } = await listSystemCatalog(filters, locale);

  return {
    data: items,
    meta: {
      total,
      page: filters.page ?? 1,
      pageSize: filters.pageSize ?? 50,
    },
  };
});
