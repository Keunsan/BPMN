"use client";

import { useTranslations } from "next-intl";
import { Children, isValidElement } from "react";

import { FilterPanelCollapseToggle } from "@/components/common/FilterPanelCollapseToggle";
import { FilterPanelContext } from "@/components/common/layout/filter-panel-context";
import {
  filterPanelFieldStackClass,
  pamsPanelCardClass,
} from "@/components/common/layout/panel-styles";
import { useUIStore } from "@/lib/store/ui.store";
import { cn } from "@/lib/utils";

type FilterPanelProps = {
  children: React.ReactNode;
  title?: string;
  /** false면 상단 제목 바(통합검색 등)를 숨긴다 */
  showTitle?: boolean;
  /** card — 패널 전체를 카드로 표현한다 */
  variant?: "default" | "card";
  /** true면 첫 번째 FilterField 라벨 행 우측에 패널 접기 버튼 표시 */
  showCollapseToggle?: boolean;
  className?: string;
};

/** 좌측 조회조건 패널 — Task 속성 관리 화면 표준 */
export const FilterPanel = ({
  children,
  title,
  showTitle = false,
  variant = "card",
  showCollapseToggle = true,
  className,
}: FilterPanelProps) => {
  const t = useTranslations("common");
  const filterPanelCollapsed = useUIStore((state) => state.filterPanelCollapsed);

  const renderChildren = () => {
    const fields = showCollapseToggle
      ? Children.map(Children.toArray(children), (child, fieldIndex) => {
          if (!isValidElement(child)) {
            return child;
          }

          return (
            <FilterPanelContext.Provider
              key={child.key ?? fieldIndex}
              value={{
                fieldIndex,
                showCollapseToggle: true,
              }}
            >
              {child}
            </FilterPanelContext.Provider>
          );
        })
      : children;

    if (variant === "card") {
      return <div className={filterPanelFieldStackClass}>{fields}</div>;
    }

    return fields;
  };

  if (filterPanelCollapsed) {
    return (
      <aside
        className={cn(
          "flex w-8 shrink-0 flex-col self-stretch transition-[width] duration-200",
          className,
        )}
      >
        <div className="flex shrink-0 justify-center pt-1">
          <FilterPanelCollapseToggle />
        </div>
      </aside>
    );
  }

  return (
    <aside
      className={cn(
        "flex w-[280px] shrink-0 flex-col self-stretch transition-[width] duration-200",
        variant === "default" && "border-r bg-card",
        variant === "card" && pamsPanelCardClass,
        className,
      )}
    >
      {showTitle ? (
        <div className="shrink-0 border-b px-4 py-3">
          <h2 className="text-xs font-semibold text-foreground">
            {title ?? t("integratedSearch")}
          </h2>
        </div>
      ) : null}
      <div
        className={cn(
          "min-h-0 flex-1 overflow-y-auto",
          variant === "default" && "px-4 py-4",
        )}
      >
        {renderChildren()}
      </div>
    </aside>
  );
};
