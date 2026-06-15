"use client";

import { LogOut, Menu, Search, User } from "lucide-react";
import { useTranslations } from "next-intl";

import { LanguageSelector } from "@/components/common/LanguageSelector";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useGuardedRouter } from "@/hooks/useGuardedRouter";
import { isAuthEnabled } from "@/lib/auth/config";
import { useLogout, useSessionStatus } from "@/lib/query/hooks/useSession";
import { useUIStore } from "@/lib/store/ui.store";
import { cn } from "@/lib/utils";

export function Header() {
  const t = useTranslations();
  const router = useGuardedRouter();
  const logoutMutation = useLogout();
  const { data: session } = useSessionStatus();
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSettled: () => {
        router.push("/login");
      },
    });
  };

  return (
    <header className="flex min-w-0 flex-1 items-center gap-4 px-4">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="shrink-0 md:hidden"
        onClick={toggleSidebar}
        aria-label={t("common.menuNavTitle")}
      >
        <Menu className="size-4" />
      </Button>
      <div className="relative mx-auto w-full max-w-xl flex-1">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder={t("common.globalSearchPlaceholder")}
          className="h-9 rounded-lg border-border/80 bg-muted/40 pl-9 pr-16 text-sm"
          readOnly
          aria-label={t("common.search")}
        />
        <kbd className="pointer-events-none absolute top-1/2 right-3 hidden -translate-y-1/2 items-center gap-0.5 rounded border bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline-flex">
          Ctrl+K
        </kbd>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-2">
        <ThemeToggle />
        <LanguageSelector />

        <div className="hidden items-center gap-2 rounded-lg border bg-muted/30 px-3 py-1.5 sm:flex">
          <div className="flex size-7 items-center justify-center rounded-full bg-primary/15 text-primary">
            <User className="size-3.5" />
          </div>
          <div className="min-w-0 text-xs leading-tight">
            <p className="truncate font-medium text-foreground">
              {session?.userAccount ?? t("common.defaultUserName")}
            </p>
            <p className="truncate text-muted-foreground">{t("common.defaultUserDept")}</p>
          </div>
        </div>

        {isAuthEnabled() ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn("pams-page-action-outline hidden sm:inline-flex")}
            onClick={handleLogout}
            disabled={logoutMutation.isPending}
          >
            <LogOut />
            {t("common.logout")}
          </Button>
        ) : null}
      </div>
    </header>
  );
}
