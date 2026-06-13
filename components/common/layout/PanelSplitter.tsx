"use client";

import { cn } from "@/lib/utils";

type PanelSplitterProps = {
  orientation: "vertical" | "horizontal";
  onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
  isResizing: boolean;
  label: string;
};

/** 패널 사이 드래그 분할선 — grid-page-ux 투명 트랙 스타일 */
export const PanelSplitter = ({
  orientation,
  onPointerDown,
  isResizing,
  label,
}: PanelSplitterProps) => (
  <div
    role="separator"
    aria-orientation={orientation}
    aria-label={label}
    className={cn(
      "relative z-20 shrink-0 touch-none select-none bg-transparent transition-colors hover:bg-primary/15 active:bg-primary/25",
      orientation === "vertical"
        ? "flex h-1.5 w-full cursor-row-resize items-center justify-center"
        : "hidden w-1.5 cursor-col-resize items-center justify-center md:flex",
      isResizing && "bg-primary/25",
    )}
    onPointerDown={onPointerDown}
  >
    <div
      className={cn(
        "pointer-events-none rounded-full bg-border",
        orientation === "vertical" ? "h-0.5 w-10" : "h-10 w-0.5",
      )}
    />
  </div>
);
