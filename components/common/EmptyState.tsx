"use client";

import { Inbox } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

type EmptyStateProps = {
  title?: string;
  description?: string;
  className?: string;
  action?: React.ReactNode;
};

/** 데이터 없음 상태 UI */
export const EmptyState = ({
  title,
  description,
  className,
  action,
}: EmptyStateProps) => {
  const t = useTranslations();

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 py-12 text-center",
        className,
      )}
    >
      <Inbox className="size-10 text-muted-foreground/60" />
      <div>
        <p className="font-medium">{title ?? t("common.noData")}</p>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
};
