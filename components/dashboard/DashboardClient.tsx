"use client";

import { LayoutDashboard } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  ContentPanel,
  ListPageBody,
  ListPageLayout,
  PageActions,
  PageContent,
  PageHeader,
} from "@/components/common/layout";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/** 대시보드 운영 현황 */
export const DashboardClient = () => {
  const t = useTranslations();

  return (
    <ListPageLayout>
      <PageHeader
        title={t("menu.dashboardOverview")}
        description={t("app.welcome")}
        icon={LayoutDashboard}
        actions={<PageActions showRegister={false} />}
      />
      <ListPageBody
        content={
          <PageContent>
            <ContentPanel title={t("menu.process")} icon bodyClassName="p-4">
              <div className="grid gap-3 md:grid-cols-3">
                {(
                  [
                    "DRAFT",
                    "IN_REVIEW",
                    "APPROVED",
                    "PUBLISHED",
                    "OBSOLETE",
                  ] as const
                ).map((status) => (
                  <Card key={status}>
                    <CardHeader className="pb-2">
                      <CardDescription>{t("menu.process")}</CardDescription>
                      <CardTitle className="text-base">
                        <Badge variant="secondary">{t(`status.${status}`)}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-xl font-bold">—</CardContent>
                  </Card>
                ))}
              </div>
            </ContentPanel>
          </PageContent>
        }
      />
    </ListPageLayout>
  );
};
