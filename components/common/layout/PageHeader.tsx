"use client";

import type { LucideIcon } from "lucide-react";

import { pamsPanelCardClass } from "@/components/common/layout/panel-styles";
import { cn } from "@/lib/utils";

/** 페이지 헤더 행 높이 */
export const shellHeaderRowClass = "flex h-11 shrink-0 items-center gap-2";

type PageHeaderProps = {
  title: string;
  description?: string;
  icon?: LucideIcon;
  actions?: React.ReactNode;
  className?: string;
};

/** 페이지 상단 — 아이콘·제목·설명·액션 버튼 영역 */
export const PageHeader = ({
  title,
  description,
  icon: Icon,
  actions,
  className,
}: PageHeaderProps) => (
  <div
    className={cn(
      pamsPanelCardClass,
      shellHeaderRowClass,
      "justify-between",
      className,
    )}
  >
    <div className="flex min-w-0 items-center gap-2">
      {Icon && (
        <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="size-3.5" />
        </div>
      )}
      <div className="flex min-w-0 items-center gap-2">
        <h1 className="shrink-0 truncate text-base font-semibold leading-none tracking-tight">
          {title}
        </h1>
        {description && (
          <>
            <span
              className="hidden h-3 w-px shrink-0 bg-border sm:block"
              aria-hidden
            />
            <p className="min-w-0 truncate text-xs leading-none text-muted-foreground/70">
              {description}
            </p>
          </>
        )}
      </div>
    </div>
    {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
  </div>
);
