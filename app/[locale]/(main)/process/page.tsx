import { Suspense } from "react";

import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import type { Locale } from "@/lib/i18n/config";
import { getProcessTree } from "@/lib/services/process.service";
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
  const treeFilters: ProcessFilters = {
    companyCode: query.companyCode?.trim() || undefined,
    businessUnitCode: query.businessUnitCode?.trim() || undefined,
  };
  const initialTree = await getProcessTree(locale as Locale, treeFilters);

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ProcessListClient
        initialTree={initialTree}
        initialTreeFilters={treeFilters}
      />
    </Suspense>
  );
};

export default ProcessListPage;
