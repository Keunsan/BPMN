"use client";

import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

type LoadingSpinnerProps = {
  className?: string;
  label?: string;
};

/** 로딩 인디케이터 */
export const LoadingSpinner = ({ className, label }: LoadingSpinnerProps) => (
  <div
    className={cn(
      "flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground",
      className,
    )}
    role="status"
    aria-live="polite"
  >
    <Loader2 className="size-8 animate-spin text-primary" />
    {label && <p className="text-sm">{label}</p>}
  </div>
);
