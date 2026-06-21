"use client";

import { GitBranch, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback } from "react";

import { EmptyState } from "@/components/common/EmptyState";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
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
  const tc = useTranslations("common");
  const { data: items, isLoading, isError, isFetching, refetch } =
    useE2eProcessTree();
  const isRefreshing = isFetching && !isLoading;

  const handleRefresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  return (
    <div className={cn("mt-4 border-t pt-3", className)}>
      <div className="mb-2 flex items-center justify-between gap-2 px-1">
        <div className="flex min-w-0 items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <GitBranch className="size-3.5 shrink-0 text-primary" />
          {t("sectionTitle")}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label={tc("refresh")}
          disabled={isFetching}
          onClick={handleRefresh}
        >
          <RefreshCw
            className={cn("size-3.5", isRefreshing && "animate-spin")}
          />
        </Button>
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
                  "flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted/60",
                  selectedId === item.e2eProcessId && "bg-accent font-medium text-accent-foreground",
                )}
                onClick={() => onSelect(item)}
              >
                <GitBranch className="mt-0.5 size-3.5 shrink-0 text-primary" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{item.name}</span>
                  <span className="block truncate font-mono text-xs text-muted-foreground">
                    {item.code}
                    {(item.participantL3Count ?? 0) > 0
                      ? ` · ${t("participantL3Count", { count: item.participantL3Count ?? 0 })}`
                      : ""}
                  </span>
                </span>
                <StatusBadge status={item.status} className="shrink-0 scale-90" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
