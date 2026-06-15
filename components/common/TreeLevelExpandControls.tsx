"use client";

import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ProcessLevel } from "@/types/process";

const defaultLevelStyles: Record<ProcessLevel, string> = {
  L1: "text-blue-600",
  L2: "text-emerald-600",
  L3: "text-amber-600",
  L4: "text-violet-600",
};

type TreeLevelExpandControlsProps = {
  levels: ProcessLevel[];
  expandedLevels: Set<ProcessLevel>;
  onToggleLevel: (level: ProcessLevel) => void;
  className?: string;
  levelClassNames?: Partial<Record<ProcessLevel, string>>;
  /** 레벨별 노드가 없으면 버튼 비활성화 */
  disabledLevels?: Set<ProcessLevel>;
};

/** 계층 트리 L1~L4 레벨별 일괄 펼치기·접기 컨트롤 */
export const TreeLevelExpandControls = ({
  levels,
  expandedLevels,
  onToggleLevel,
  className,
  levelClassNames = defaultLevelStyles,
  disabledLevels,
}: TreeLevelExpandControlsProps) => {
  const t = useTranslations("process");

  return (
    <div
      className={cn("flex flex-wrap items-center gap-2", className)}
      role="toolbar"
      aria-label={t("treeLevelControls")}
    >
      <span className="shrink-0 text-xs text-muted-foreground">
        {t("treeLevelControls")}
      </span>
      <div className="inline-flex flex-wrap gap-1 rounded-lg border bg-muted/30 p-0.5">
        {levels.map((level) => {
          const isExpanded = expandedLevels.has(level);
          const isDisabled = disabledLevels?.has(level) ?? false;

          return (
            <Button
              key={level}
              type="button"
              size="xs"
              variant={isExpanded ? "secondary" : "ghost"}
              disabled={isDisabled}
              className={cn(
                "min-w-9 font-semibold tabular-nums",
                !isExpanded && levelClassNames[level],
              )}
              aria-pressed={isExpanded}
              aria-label={
                isExpanded
                  ? t("treeLevelCollapse", { level })
                  : t("treeLevelExpand", { level })
              }
              onClick={() => onToggleLevel(level)}
            >
              {level}
            </Button>
          );
        })}
      </div>
    </div>
  );
};
