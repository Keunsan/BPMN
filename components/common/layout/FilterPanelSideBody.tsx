"use client";

import { useTranslations } from "next-intl";

import { PanelSplitter } from "@/components/common/layout/PanelSplitter";
import { useFilterPanelSideLayout } from "@/hooks/useFilterPanelSideLayout";
import { cn } from "@/lib/utils";

export type FilterPanelSideBodyProps = {
  filter: React.ReactNode;
  children: React.ReactNode;
  storageKey: string;
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  splitterLabel?: string;
  className?: string;
  filterClassName?: string;
};

/** 좌측 FilterPanel + 가로 스플리터 + 우측 콘텐츠 — 목록·Task 매핑 공통 본문 */
export const FilterPanelSideBody = ({
  filter,
  children,
  storageKey,
  defaultWidth = 280,
  minWidth = 280,
  maxWidth = 480,
  splitterLabel,
  className,
  filterClassName,
}: FilterPanelSideBodyProps) => {
  const t = useTranslations("common");
  const {
    effectivePanelWidth,
    isResizing,
    handleResizePointerDown,
    showHorizontalSplitter,
  } = useFilterPanelSideLayout({
    storageKey,
    defaultWidth,
    minWidth,
    maxWidth,
  });

  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row",
        className,
      )}
    >
      <div
        className={cn(
          "flex min-h-[220px] w-full shrink-0 flex-col overflow-hidden md:min-h-0 md:w-auto md:self-stretch",
          filterClassName,
        )}
        style={{ width: effectivePanelWidth }}
      >
        <div className="flex h-full min-h-0 w-full flex-1 flex-col">{filter}</div>
      </div>

      {showHorizontalSplitter ? (
        <PanelSplitter
          orientation="horizontal"
          label={splitterLabel ?? t("filterPanelResizeHorizontal")}
          isResizing={isResizing}
          onPointerDown={handleResizePointerDown}
        />
      ) : null}

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
};
