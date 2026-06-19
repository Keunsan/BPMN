"use client";

import { Construction } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  ContentPanel,
  ListPageBody,
  ListPageLayout,
  PageActions,
  PageContent,
  PageHeader,
} from "@/components/common/layout";
import {
  placeholderPageIcons,
  type PlaceholderPageIconKey,
} from "@/components/common/placeholder-page-icons";
import { EmptyState } from "@/components/pams/empty-state";

type PlaceholderPageClientProps = {
  titleKey: string;
  iconKey: PlaceholderPageIconKey;
  emptyTitle: string;
  emptyDescription: string;
};

/** 미구현 메뉴 공통 스텁 화면 */
export const PlaceholderPageClient = ({
  titleKey,
  iconKey,
  emptyTitle,
  emptyDescription,
}: PlaceholderPageClientProps) => {
  const t = useTranslations();
  const Icon = placeholderPageIcons[iconKey];

  return (
    <ListPageLayout>
      <PageHeader
        title={t(titleKey)}
        description={emptyDescription}
        icon={Construction}
        actions={<PageActions showRegister={false} />}
      />
      <ListPageBody
        content={
          <PageContent>
            <ContentPanel title={t(titleKey)} icon>
              <EmptyState
                icon={Icon}
                title={emptyTitle}
                description={emptyDescription}
                className="min-h-[40vh]"
              />
            </ContentPanel>
          </PageContent>
        }
      />
    </ListPageLayout>
  );
};
