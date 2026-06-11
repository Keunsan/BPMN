"use client";

import { Plus, Search } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PageActionsProps = {
  onSearch?: () => void;
  onRegister?: () => void;
  searchLabel?: string;
  registerLabel?: string;
  searchDisabled?: boolean;
  registerDisabled?: boolean;
  showSearch?: boolean;
  showRegister?: boolean;
  className?: string;
};

/** 목록 화면 공통 액션 — 조회(아웃라인) · 등록(솔리드) */
export const PageActions = ({
  onSearch,
  onRegister,
  searchLabel,
  registerLabel,
  searchDisabled = false,
  registerDisabled = false,
  showSearch = true,
  showRegister = true,
  className,
}: PageActionsProps) => {
  const t = useTranslations("common");

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {showSearch && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="pams-page-action-outline"
          onClick={onSearch}
          disabled={searchDisabled || !onSearch}
        >
          <Search />
          {searchLabel ?? t("query")}
        </Button>
      )}
      {showRegister && (
        <Button
          type="button"
          size="sm"
          onClick={onRegister}
          disabled={registerDisabled || !onRegister}
        >
          <Plus />
          {registerLabel ?? t("register")}
        </Button>
      )}
    </div>
  );
};
