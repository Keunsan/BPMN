"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";

import { SidebarPanelToggle } from "@/components/common/SidebarPanelToggle";
import { useAppSidebarWidth } from "@/hooks/useAppSidebarWidth";
import { useUIStore } from "@/lib/store/ui.store";
import { cn } from "@/lib/utils";

/** 상단 헤더 행 좌측 — PAMS 로고·앱명·사이드바 토글 */
export const SidebarBrand = () => {
  const t = useTranslations();
  const hydrateSidebarCollapsed = useUIStore((s) => s.hydrateSidebarCollapsed);
  const { asideWidth, sidebarOpen, sidebarCollapsed } = useAppSidebarWidth();

  useEffect(() => {
    hydrateSidebarCollapsed();
  }, [hydrateSidebarCollapsed]);

  if (!sidebarOpen) {
    return null;
  }

  return (
    <div
      className={cn(
        "hidden h-14 shrink-0 items-center gap-2 border-r bg-sidebar px-2 text-sidebar-foreground md:flex",
        sidebarCollapsed ? "flex-col justify-center gap-0.5" : "flex-row px-3",
      )}
      style={{ width: asideWidth }}
    >
      <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
        P
      </div>
      {!sidebarCollapsed && (
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-semibold leading-tight">
            {t("app.title")}
          </p>
          <p className="truncate text-sm leading-snug text-muted-foreground">
            {t("app.description")}
          </p>
        </div>
      )}
      <SidebarPanelToggle
        className={cn("shrink-0", sidebarCollapsed && "mt-1")}
      />
    </div>
  );
};
