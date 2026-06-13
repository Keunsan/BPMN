import { withApiHandler } from "@/lib/api/route-handler";
import { listScreenCatalog } from "@/lib/services/system.service";
import type { ScreenCatalogFilters } from "@/types/system";

/** GET /api/metadata/screens — 연결 후보 화면 카탈로그 */
export const GET = withApiHandler(async ({ locale, request }) => {
  const url = new URL(request.url);
  const systemId = url.searchParams.get("systemId");
  const moduleCode = url.searchParams.get("moduleCode") ?? undefined;
  const search = url.searchParams.get("search") ?? undefined;
  const excludeNodeId = url.searchParams.get("excludeNodeId");
  const page = url.searchParams.get("page");
  const pageSize = url.searchParams.get("pageSize");

  const filters: ScreenCatalogFilters = {
    moduleCode,
    search,
    systemId: systemId ? Number(systemId) : undefined,
    excludeNodeId: excludeNodeId ? Number(excludeNodeId) : undefined,
    page: page ? Number(page) : 1,
    pageSize: pageSize ? Number(pageSize) : 50,
  };

  const { items, total } = await listScreenCatalog(filters, locale);

  return {
    data: items,
    meta: {
      total,
      page: filters.page ?? 1,
      pageSize: filters.pageSize ?? 50,
    },
  };
});
