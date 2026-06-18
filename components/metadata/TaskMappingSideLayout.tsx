"use client";

import { FilterPanelSideBody } from "@/components/common/layout/FilterPanelSideBody";
import { TaskMappingLeftPanel } from "@/components/metadata/TaskMappingLeftPanel";
import { cn } from "@/lib/utils";
import type { TaskMappingLeftPanelProps } from "@/components/metadata/TaskMappingLeftPanel";

type TaskMappingSideLayoutProps = TaskMappingLeftPanelProps & {
  storageKey: string;
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  splitterLabel?: string;
  children: React.ReactNode;
  className?: string;
};

/** Task 매핑 화면 공통 본문 — 리사이즈 좌측 패널 + 우측 콘텐츠 */
export const TaskMappingSideLayout = ({
  storageKey,
  defaultWidth = 300,
  minWidth = 280,
  maxWidth = 640,
  splitterLabel,
  children,
  className,
  ...panelProps
}: TaskMappingSideLayoutProps) => {
  return (
    <FilterPanelSideBody
      storageKey={storageKey}
      defaultWidth={defaultWidth}
      minWidth={minWidth}
      maxWidth={maxWidth}
      splitterLabel={splitterLabel}
      className={cn(className)}
      filter={
        <TaskMappingLeftPanel {...panelProps} className="h-full w-full" />
      }
    >
      {children}
    </FilterPanelSideBody>
  );
};
