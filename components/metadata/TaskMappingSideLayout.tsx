"use client";

import { PanelSplitter } from "@/components/common/layout";
import { TaskMappingLeftPanel } from "@/components/metadata/TaskMappingLeftPanel";
import { useHorizontalPanelResize } from "@/hooks/useHorizontalPanelResize";
import { cn } from "@/lib/utils";
import type { TaskMappingLeftPanelProps } from "@/components/metadata/TaskMappingLeftPanel";

type TaskMappingSideLayoutProps = TaskMappingLeftPanelProps & {
  storageKey: string;
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  splitterLabel: string;
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
  const {
    width: panelWidth,
    isResizing,
    handleResizePointerDown,
  } = useHorizontalPanelResize({
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
        className="flex min-h-[220px] w-full shrink-0 flex-col overflow-hidden md:min-h-0 md:w-auto"
        style={{ width: panelWidth }}
      >
        <TaskMappingLeftPanel {...panelProps} className="h-full w-full" />
      </div>

      <PanelSplitter
        orientation="horizontal"
        label={splitterLabel}
        isResizing={isResizing}
        onPointerDown={handleResizePointerDown}
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
};
