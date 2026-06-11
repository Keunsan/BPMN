import { getTranslations } from "next-intl/server";

import { LoginForm } from "@/components/auth/LoginForm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function LoginPage() {
  const t = await getTranslations();

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>{t("menu.login")}</CardTitle>
        <CardDescription>{t("app.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-muted-foreground">
        <p>{t("app.welcome")}</p>
        <LoginForm />
      </CardContent>
    </Card>
  );
}
