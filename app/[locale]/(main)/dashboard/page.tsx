import { getTranslations } from "next-intl/server";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function DashboardPage() {
  const t = await getTranslations();

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("menu.dashboard")}</h1>
        <p className="text-muted-foreground">{t("app.welcome")}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
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
            <CardContent className="text-2xl font-bold">—</CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
