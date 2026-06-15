"use client";

import { Clock, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { useSessionTimer } from "@/hooks/useSessionTimer";
import { isAuthEnabled } from "@/lib/auth/config";
import { cn } from "@/lib/utils";

type StatusBarProps = {
  className?: string;
};

const formatRemaining = (remainingMs: number | null): string => {
  if (remainingMs === null || remainingMs <= 0) {
    return "0:00";
  }

  const totalSeconds = Math.ceil(remainingMs / 1_000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
};

/** 하단 상태바 — 세션 타이머·연장 (인증 활성 시에만 표시) */
export const StatusBar = ({ className }: StatusBarProps) => {
  const authEnabled = isAuthEnabled();
  const t = useTranslations("common");
  const { remainingMs, progress, isWarning, isExtending, extend, refetch } =
    useSessionTimer();

  if (!authEnabled) {
    return null;
  }

  return (
    <footer
      className={cn(
        "flex h-8 shrink-0 items-center justify-between border-t bg-card px-3 text-xs text-muted-foreground",
        className,
      )}
    >
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label={t("refresh")}
          onClick={() => void refetch()}
        >
          <RefreshCw />
        </Button>
      </div>
      <div className="flex items-center gap-2">
        <div className="hidden h-1.5 w-28 overflow-hidden rounded-full bg-muted sm:block">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              isWarning ? "bg-amber-500" : "bg-primary/70",
            )}
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
        <span
          className={cn(
            "flex items-center gap-1 tabular-nums",
            isWarning && "font-medium text-amber-600 dark:text-amber-400",
          )}
        >
          <Clock className="size-3" />
          {t("sessionRemainingFormat", {
            time: formatRemaining(remainingMs),
          })}
        </span>
        <Button
          type="button"
          variant="outline"
          size="xs"
          className="pams-page-action-outline h-6 px-2"
          onClick={extend}
          disabled={isExtending}
        >
          {isExtending ? t("extending") : t("extendSession")}
        </Button>
      </div>
    </footer>
  );
};
