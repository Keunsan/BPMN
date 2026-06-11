"use client";

import { listPageContentBodyClass } from "@/components/common/layout/panel-styles";
import { cn } from "@/lib/utils";

type PageContentProps = {
  children: React.ReactNode;
  /** @deprecated DataGrid·ContentPanel title 사용 권장 */
  title?: string;
  /** @deprecated DataGrid·ContentPanel count 사용 권장 */
  count?: number;
  countSuffix?: string;
  /** @deprecated DataGrid·ContentPanel toolbar 사용 권장 */
  toolbar?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
};

/** 우측 콘텐츠 영역 — DataGrid·ContentPanel 래퍼 */
export const PageContent = ({
  children,
  title,
  count,
  countSuffix,
  toolbar,
  className,
  bodyClassName,
}: PageContentProps) => (
  <section className={cn("flex min-h-0 min-w-0 flex-1 flex-col", className)}>
    {(title || count !== undefined || toolbar) && (
      <div className="flex shrink-0 items-center justify-between gap-3 border-b bg-card/50 px-5 py-2.5">
        <div className="flex min-w-0 items-baseline gap-2">
          {title && (
            <span className="text-sm font-semibold text-foreground">{title}</span>
          )}
          {count !== undefined && (
            <span className="text-xs text-muted-foreground">
              ({count.toLocaleString()}
              {countSuffix ? ` ${countSuffix}` : ""})
            </span>
          )}
        </div>
        {toolbar && <div className="flex items-center gap-2">{toolbar}</div>}
      </div>
    )}
    <div className={cn(listPageContentBodyClass, bodyClassName)}>{children}</div>
  </section>
);
