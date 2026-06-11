"use client";

import { cn } from "@/lib/utils";

type ListPageLayoutProps = {
  children: React.ReactNode;
  className?: string;
};

/** 목록/조회 화면 공통 레이아웃 — 헤더 + 좌측 필터 + 우측 콘텐츠 */
export const ListPageLayout = ({ children, className }: ListPageLayoutProps) => (
  <div className={cn("flex h-full min-h-0 flex-col gap-1.5", className)}>{children}</div>
);
