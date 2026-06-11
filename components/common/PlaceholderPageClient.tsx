"use client";

import { Construction } from "lucide-react";
import { useTranslations } from "next-intl";

import { EmptyState } from "@/components/common/EmptyState";
import {
  ContentPanel,
  ListPageBody,
  ListPageLayout,
  PageActions,
  PageContent,
  PageHeader,
} from "@/components/common/layout";

type PlaceholderPageClientProps = {
  titleKey: string;
};

/** 미구현 메뉴 공통 스텁 화면 */
export const PlaceholderPageClient = ({ titleKey }: PlaceholderPageClientProps) => {
  const t = useTranslations();
  const tc = useTranslations("common");

  return (
    <ListPageLayout>
      <PageHeader
        title={t(titleKey)}
        description={tc("noData")}
        icon={Construction}
        actions={<PageActions showRegister={false} />}
      />
      <ListPageBody
        content={
          <PageContent>
            <ContentPanel title={t(titleKey)} icon>
              <EmptyState title={tc("noData")} className="min-h-[40vh]" />
            </ContentPanel>
          </PageContent>
        }
      />
    </ListPageLayout>
  );
};
