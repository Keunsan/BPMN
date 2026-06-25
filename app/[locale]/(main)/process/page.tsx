import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";

import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import type { Locale } from "@/lib/i18n/config";
import { getQueryClient } from "@/lib/query/client";
import { processKeys } from "@/lib/query/keys";
import { getProcessTree } from "@/lib/services/process.service";
import { serializeProcessTreeForClient } from "@/lib/utils/process";
import type { ProcessFilters } from "@/types/process";

import { ProcessListClient } from "./ProcessListClient";

type ProcessListPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    companyCode?: string;
    businessUnitCode?: string;
  }>;
};

/** 전사 프로세스 맵 */
const ProcessListPage = async ({ params, searchParams }: ProcessListPageProps) => {
  const { locale } = await params;
  const query = await searchParams;
  setRequestLocale(locale);

  const treeFilters: ProcessFilters = {
    companyCode: query.companyCode?.trim() || undefined,
    businessUnitCode: query.businessUnitCode?.trim() || undefined,
  };

  const queryClient = getQueryClient();
  await queryClient.prefetchQuery({
    queryKey: processKeys.tree(treeFilters),
    queryFn: async () =>
      serializeProcessTreeForClient(
        await getProcessTree(locale as Locale, treeFilters),
      ),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense fallback={<LoadingSpinner />}>
        <ProcessListClient />
      </Suspense>
    </HydrationBoundary>
  );
};

export default ProcessListPage;
