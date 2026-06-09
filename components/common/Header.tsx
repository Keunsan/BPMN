"use client";

import {
  LayoutDashboard,
  Menu,
  Search,
  User,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { LanguageSelector } from "@/components/common/LanguageSelector";
import { GuardedLink } from "@/components/common/GuardedLink";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useGuardedRouter } from "@/hooks/useGuardedRouter";
import { useUIStore } from "@/lib/store/ui.store";

export function Header() {
  const t = useTranslations();
  const router = useGuardedRouter();
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-background px-4">
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={toggleSidebar}
        aria-label="Toggle sidebar"
      >
        <Menu className="size-4" />
      </Button>

      <GuardedLink href="/dashboard" className="flex items-center gap-2 font-semibold">
        <LayoutDashboard className="size-5 text-primary" />
        <span className="hidden sm:inline">{t("app.title")}</span>
      </GuardedLink>

      <div className="relative mx-auto hidden max-w-md flex-1 md:block">
        <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder={t("common.search")}
          className="pl-8"
          readOnly
          aria-label={t("common.search")}
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <LanguageSelector />

        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(buttonVariants({ variant: "outline", size: "icon-sm" }))}
            aria-label="User menu"
          >
            <User className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => router.push("/login")}>
              {t("menu.login")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
