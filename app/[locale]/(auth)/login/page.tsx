import { getTranslations } from "next-intl/server";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Link } from "@/lib/i18n/navigation";

export default async function LoginPage() {
  const t = await getTranslations();

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>{t("menu.login")}</CardTitle>
        <CardDescription>{t("app.description")}</CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        <p>{t("app.welcome")}</p>
        <p className="mt-4">
          <Link href="/dashboard" className="text-primary underline">
            {t("menu.dashboard")}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
