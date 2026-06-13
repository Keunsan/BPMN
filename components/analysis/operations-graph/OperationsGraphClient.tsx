"use client";

import { Network } from "lucide-react";
import { useTranslations } from "next-intl";

import { OperationsGraphWorkspace } from "@/components/analysis/operations-graph/OperationsGraphWorkspace";
import { ListPageLayout, PageHeader } from "@/components/common/layout";

/** 운영 지식그래프 워크스페이스 페이지 */
export const OperationsGraphClient = () => {
  const t = useTranslations("operationsGraph");

  return (
    <ListPageLayout>
      <PageHeader title={t("title")} icon={Network} />
      <OperationsGraphWorkspace />
    </ListPageLayout>
  );
};
