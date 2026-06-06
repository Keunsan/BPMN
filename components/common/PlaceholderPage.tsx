import { getTranslations } from "next-intl/server";

type PlaceholderPageProps = {
  titleKey: string;
};

export async function PlaceholderPage({ titleKey }: PlaceholderPageProps) {
  const t = await getTranslations();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">{t(titleKey)}</h1>
      <p className="mt-2 text-muted-foreground">{t("common.noData")}</p>
    </div>
  );
}
