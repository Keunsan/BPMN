import { getTranslations } from "next-intl/server";

import { LanguageSelector } from "@/components/common/LanguageSelector";
import { Link } from "@/lib/i18n/navigation";

const mainNav = [
  { href: "/dashboard", labelKey: "menu.dashboard" },
  { href: "/process", labelKey: "menu.process" },
  { href: "/bpmn", labelKey: "menu.bpmn" },
  { href: "/metadata/task-attribute/1", labelKey: "menu.metadata" },
  { href: "/data/external-tables", labelKey: "menu.data" },
  { href: "/analysis/search", labelKey: "menu.analysis" },
] as const;

export default async function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const t = await getTranslations();

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex items-center justify-between gap-4 border-b px-6 py-3">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-lg font-semibold">
            {t("app.title")}
          </Link>
          <nav className="hidden items-center gap-4 text-sm md:flex">
            {mainNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                {t(item.labelKey)}
              </Link>
            ))}
          </nav>
        </div>
        <LanguageSelector />
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
