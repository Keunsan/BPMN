"use client";

import { useTranslations } from "next-intl";

import { FilterPanel } from "@/components/common/layout";
import { TaskAttributeProcessTree } from "@/components/metadata/TaskAttributeProcessTree";
import { ProcessScopeFilter } from "@/components/process/ProcessScopeFilter";
import { cn } from "@/lib/utils";
import type { E2eProcessDto } from "@/types/e2e-process";
import type { ProcessFilters, ProcessLevel, ProcessNodeTree } from "@/types/process";

type TaskMappingLeftPanelProps = {
  selectedProcessId?: number;
  selectedE2eId?: number;
  onSelectProcess: (node: ProcessNodeTree) => void;
  onSelectE2e?: (process: E2eProcessDto) => void;
  selectableLevels?: ProcessLevel[];
  /** false면 E2E는 표시만 하고 선택 불가 */
  e2eSelectable?: boolean;
  companyCode: string;
  businessUnitCode: string;
  onScopeChange: (
    scope: Pick<ProcessFilters, "companyCode" | "businessUnitCode">,
  ) => void;
  scopeFilters: Pick<ProcessFilters, "companyCode" | "businessUnitCode">;
  title?: string;
  className?: string;
};

export type { TaskMappingLeftPanelProps };

/** Task 매핑 화면 공통 좌측 패널 — 범위 필터 + E2E + 프로세스 트리 */
export const TaskMappingLeftPanel = ({
  selectedProcessId,
  selectedE2eId,
  onSelectProcess,
  onSelectE2e,
  selectableLevels,
  e2eSelectable = true,
  companyCode,
  businessUnitCode,
  onScopeChange,
  scopeFilters,
  title,
  className,
}: TaskMappingLeftPanelProps) => {
  const t = useTranslations("metadata");

  return (
    <FilterPanel
      showTitle
      showCollapseToggle
      title={title ?? t("processTree")}
      className={cn("h-full w-full", className)}
    >
      <ProcessScopeFilter
        embedded
        companyCode={companyCode}
        businessUnitCode={businessUnitCode}
        onScopeChange={onScopeChange}
      />
      <TaskAttributeProcessTree
        selectedProcessId={selectedProcessId}
        selectedE2eId={selectedE2eId}
        onSelectProcess={onSelectProcess}
        onSelectE2e={onSelectE2e}
        selectableLevels={selectableLevels}
        e2eSelectable={e2eSelectable}
        scopeFilters={scopeFilters}
      />
    </FilterPanel>
  );
};
