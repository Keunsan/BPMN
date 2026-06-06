import { redirect } from "@/lib/i18n/navigation";

type LocaleHomePageProps = {
  params: Promise<{ locale: string }>;
};

export default async function LocaleHomePage({ params }: LocaleHomePageProps) {
  const { locale } = await params;
  redirect({ href: "/dashboard", locale });
}
