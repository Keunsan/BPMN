"use client";



import { FilterPanelCollapseToggle } from "@/components/common/FilterPanelCollapseToggle";

import { useFilterPanelFieldSlot } from "@/components/common/layout/filter-panel-context";

import { Label } from "@/components/ui/label";

import { cn } from "@/lib/utils";



type FilterFieldProps = {

  label: string;

  required?: boolean;

  children: React.ReactNode;

  className?: string;

  /** 라벨 행 우측 액션 — 미지정 시 FilterPanel showCollapseToggle 첫 필드에 토글 표시 */

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

  const { fieldIndex, showCollapseToggle } = useFilterPanelFieldSlot();

  const resolvedLabelAction =

    labelAction ??

    (showCollapseToggle && fieldIndex === 0 ? (

      <FilterPanelCollapseToggle compact />

    ) : null);



  return (

    <div className={cn("pams-filter-field space-y-1.5", className)}>

      <div className="flex items-center justify-between gap-2">

        <Label className="min-w-0 flex-1 truncate text-[10px] font-normal text-slate-400 dark:text-slate-500">

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


