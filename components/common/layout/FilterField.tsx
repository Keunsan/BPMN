"use client";

import { useId } from "react";

import { useFilterPanelSlot } from "@/components/common/layout/filter-panel-context";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type FilterFieldProps = {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
  /** 라벨 행 우측 액션 — 미지정 시 FilterPanel 첫 필드에 접기 버튼 표시 */
  labelAction?: React.ReactNode;
};

/** 조회조건 단일 필드 — 라벨 + 입력 컨트롤 */
export const FilterField = ({
  label,
  required = false,
  children,
  className,
  labelAction,
}: FilterFieldProps) => {
  const fieldId = useId();
  const slot = useFilterPanelSlot();
  const resolvedLabelAction =
    labelAction ??
    (slot?.showCollapseToggle && slot.isCollapseToggleHost(fieldId)
      ? slot.collapseToggle
      : null);

  return (
    <div className={cn("pams-filter-field space-y-1.5", className)}>
      <div className="flex items-center justify-between gap-2">
        <Label className="min-w-0 flex-1 truncate text-xs font-normal text-slate-400 dark:text-slate-500">
          {label}
          {required && <span className="ml-0.5 text-destructive">*</span>}
        </Label>
        {resolvedLabelAction ? (
          <div className="flex shrink-0 items-center">{resolvedLabelAction}</div>
        ) : null}
      </div>
      {children}
    </div>
  );
};
