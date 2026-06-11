"use client";

import { cn } from "@/lib/utils";

type ListPageBodyProps = {
  filter?: React.ReactNode;
  content: React.ReactNode;
  className?: string;
};

/** 좌측 필터 + 우측 콘텐츠 2열 본문 */
export const ListPageBody = ({ filter, content, className }: ListPageBodyProps) => (
  <div className={cn("flex min-h-0 flex-1 gap-1.5 overflow-hidden", className)}>
    {filter}
    {content}
  </div>
);
