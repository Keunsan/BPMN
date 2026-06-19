"use client";

import { cn } from "@/lib/utils";

type FillHandleProps = {
  visible: boolean;
  onMouseDown: (event: React.MouseEvent) => void;
};

/** 셀 범위 우하단 fill-down 드래그 핸들 */
export const FillHandle = ({ visible, onMouseDown }: FillHandleProps) => {
  if (!visible) {
    return null;
  }

  return (
    <button
      type="button"
      aria-label="Fill down"
      className={cn(
        "absolute bottom-0 right-0 z-20 size-2.5 translate-x-1/2 translate-y-1/2",
        "cursor-crosshair rounded-sm border border-primary bg-primary",
      )}
      onMouseDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onMouseDown(event);
      }}
    />
  );
};
