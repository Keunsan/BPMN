"use client";

import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ProcessStatus } from "@/types/process";

const statusVariant: Record<
  ProcessStatus,
  "default" | "secondary" | "outline" | "destructive"
> = {
  DRAFT: "secondary",
  IN_REVIEW: "outline",
  APPROVED: "default",
  PUBLISHED: "default",
  OBSOLETE: "destructive",
};

type StatusBadgeProps = {
  status: ProcessStatus;
  className?: string;
};

/** 상태 배지 — 다국어 상태명 표시 */
export const StatusBadge = ({ status, className }: StatusBadgeProps) => {
  const t = useTranslations("status");

  return (
    <Badge variant={statusVariant[status]} className={cn(className)}>
      {t(status)}
    </Badge>
  );
};
