"use client";

import { GitBranch } from "lucide-react";
import { useTranslations } from "next-intl";

import { EmptyState } from "@/components/common/EmptyState";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { StatusBadge } from "@/components/common/StatusBadge";
import { useE2eProcessTree } from "@/lib/query/hooks/useE2eProcess";
import { cn } from "@/lib/utils";
import type { E2eProcessDto } from "@/types/e2e-process";

type E2eProcessTreeSectionProps = {
  selectedId?: number;
  onSelect: (process: E2eProcessDto) => void;
  className?: string;
};

/** 프로세스 맵 좌측 E2E 가상 섹션 */
export const E2eProcessTreeSection = ({
  selectedId,
  onSelect,
  className,
}: E2eProcessTreeSectionProps) => {
  const t = useTranslations("e2eProcess");
  const { data: items, isLoading, isError } = useE2eProcessTree();

  return (
    <div className={cn("mt-4 border-t pt-3", className)}>
      <div className="mb-2 flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <GitBranch className="size-3.5 text-sky-600" />
        {t("sectionTitle")}
      </div>
      {isLoading ? (
        <LoadingSpinner className="py-4" />
      ) : isError ? (
        <EmptyState title={t("loadError")} />
      ) : !items?.length ? (
        <p className="px-2 text-xs text-muted-foreground">{t("empty")}</p>
      ) : (
        <ul className="space-y-0.5">
          {items.map((item) => (
            <li key={item.e2eProcessId}>
              <button
                type="button"
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted/60",
                  selectedId === item.e2eProcessId && "bg-muted font-medium",
                )}
                onClick={() => onSelect(item)}
              >
                <GitBranch className="size-3.5 shrink-0 text-sky-600" />
                <span className="min-w-0 flex-1 truncate">{item.name}</span>
                <StatusBadge status={item.status} className="shrink-0 scale-90" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
