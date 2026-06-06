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
};

/** 통합 검색바 */
export const SearchBar = ({
  value,
  onChange,
  placeholder,
  className,
}: SearchBarProps) => {
  const t = useTranslations();

  return (
    <div className={cn("relative", className)}>
      <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? t("common.search")}
        className="pl-8"
        aria-label={t("common.search")}
      />
    </div>
  );
};
