"use client";

import { Search } from "lucide-react";
import { useTranslations } from "next-intl";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  variant?: "default" | "filter";
};

/** 통합 검색바 */
export const SearchBar = ({
  value,
  onChange,
  placeholder,
  className,
  variant = "default",
}: SearchBarProps) => {
  const t = useTranslations();

  return (
    <div className={cn("relative", className)}>
      <Search
        className={cn(
          "absolute top-1/2 -translate-y-1/2 text-muted-foreground",
          variant === "filter"
            ? "left-2 size-3.5 text-slate-500 dark:text-slate-400"
            : "left-2.5 size-4",
        )}
      />
      <Input
        type="search"
        variant={variant}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? t("common.search")}
        className={variant === "filter" ? "pl-7" : "pl-8"}
        aria-label={t("common.search")}
      />
    </div>
  );
};
