"use client";

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { useUIStore } from "@/lib/store/ui.store";
import { cn } from "@/lib/utils";

type FilterPanelCollapseToggleProps = {
  /** true면 필터 라벨 행과 비슷한 컴팩트 크기 */
  compact?: boolean;
  className?: string;
};

/** 목록 화면 좌측 조회조건 패널 접기/펼치기 */
export const FilterPanelCollapseToggle = ({
  compact = false,
  className,
}: FilterPanelCollapseToggleProps) => {
  const t = useTranslations("common");
  const filterPanelCollapsed = useUIStore((state) => state.filterPanelCollapsed);
  const setFilterPanelCollapsed = useUIStore(
    (state) => state.setFilterPanelCollapsed,
  );

  const label = filterPanelCollapsed
    ? t("filterPanelExpand")
    : t("filterPanelCollapse");

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
      onClick={() => setFilterPanelCollapsed(!filterPanelCollapsed)}
      title={label}
      aria-label={label}
      aria-expanded={!filterPanelCollapsed}
    >
      {filterPanelCollapsed ? (
        <PanelLeftOpen className={compact ? "size-3.5" : undefined} />
      ) : (
        <PanelLeftClose className={compact ? "size-3.5" : undefined} />
      )}
    </Button>
  );
};
