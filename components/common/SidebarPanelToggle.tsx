"use client";

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { useUIStore } from "@/lib/store/ui.store";
import { cn } from "@/lib/utils";

type SidebarPanelToggleProps = {
  /** true면 필터 라벨(text-xs)과 동일한 15px 크기 */
  compact?: boolean;
  className?: string;
};

/** 네비게이션 사이드바 접기/펼치기 */
export const SidebarPanelToggle = ({
  compact = false,
  className,
}: SidebarPanelToggleProps) => {
  const t = useTranslations("common");
  const sidebarCollapsed = useUIStore((state) => state.sidebarCollapsed);
  const setSidebarCollapsed = useUIStore((state) => state.setSidebarCollapsed);

  const label =
    sidebarCollapsed ? t("sidebarExpand") : t("sidebarCollapse");

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className={cn(
        "shrink-0 text-muted-foreground hover:text-foreground",
        compact && "!size-4 rounded-sm p-0",
        className,
      )}
      onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
      title={label}
      aria-label={label}
    >
      {sidebarCollapsed ? (
        <PanelLeftOpen className={compact ? "size-3.5" : undefined} />
      ) : (
        <PanelLeftClose className={compact ? "size-3.5" : undefined} />
      )}
    </Button>
  );
};
