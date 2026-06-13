"use client";

import {
  Download,
  GitBranch,
  LayoutGrid,
  Search,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { SearchBar } from "@/components/common/SearchBar";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { GraphViewMode } from "@/types/operations-graph";

type GraphToolbarProps = {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  showGraph: boolean;
  onShowGraphChange: (value: boolean) => void;
  showInterfaces: boolean;
  onShowInterfacesChange: (value: boolean) => void;
  showTables: boolean;
  onShowTablesChange: (value: boolean) => void;
  highlightCritical: boolean;
  onHighlightCriticalChange: (value: boolean) => void;
  viewMode: GraphViewMode;
  onViewModeChange: (value: GraphViewMode) => void;
  onExport: () => void;
  exportDisabled?: boolean;
};

const ToggleButton = ({
  pressed,
  onClick,
  children,
  title,
}: {
  pressed: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title: string;
}) => (
  <Button
    type="button"
    variant="outline"
    size="sm"
    className={cn(
      "pams-page-action-outline",
      pressed && "border-primary/40 bg-primary/8 text-foreground",
    )}
    aria-pressed={pressed}
    onClick={onClick}
    title={title}
  >
    {children}
  </Button>
);

/** 중앙 캔버스 상단 도구바 */
export const GraphToolbar = ({
  searchTerm,
  onSearchChange,
  showGraph,
  onShowGraphChange,
  showInterfaces,
  onShowInterfacesChange,
  showTables,
  onShowTablesChange,
  highlightCritical,
  onHighlightCriticalChange,
  viewMode,
  onViewModeChange,
  onExport,
  exportDisabled,
}: GraphToolbarProps) => {
  const t = useTranslations("operationsGraph");

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-slate-200/80 px-3 py-2 dark:border-slate-600/60">
      <SearchBar
        value={searchTerm}
        onChange={onSearchChange}
        placeholder={t("toolbar.searchPlaceholder")}
        variant="filter"
        className="w-[200px]"
      />

      <div className="hidden h-5 w-px bg-border sm:block" aria-hidden />

      <ToggleButton
        pressed={showGraph}
        onClick={() => onShowGraphChange(!showGraph)}
        title={t("toolbar.toggleGraph")}
      >
        <LayoutGrid />
        {t("toolbar.graph")}
      </ToggleButton>

      <ToggleButton
        pressed={showInterfaces}
        onClick={() => onShowInterfacesChange(!showInterfaces)}
        title={t("toolbar.toggleInterfaces")}
      >
        <GitBranch />
        {t("toolbar.interfaces")}
      </ToggleButton>

      <ToggleButton
        pressed={showTables}
        onClick={() => onShowTablesChange(!showTables)}
        title={t("toolbar.toggleTables")}
      >
        <Search className="size-3.5" />
        {t("toolbar.tables")}
      </ToggleButton>

      <ToggleButton
        pressed={highlightCritical}
        onClick={() => onHighlightCriticalChange(!highlightCritical)}
        title={t("toolbar.toggleCritical")}
      >
        {t("toolbar.critical")}
      </ToggleButton>

      <Select
        value={viewMode}
        onValueChange={(value) =>
          onViewModeChange(value as GraphViewMode)
        }
      >
        <SelectTrigger variant="filter" size="sm" className="w-[132px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="hierarchical">
            {t("toolbar.viewHierarchical")}
          </SelectItem>
          <SelectItem value="radial">{t("toolbar.viewRadial")}</SelectItem>
        </SelectContent>
      </Select>

      <div className="ml-auto flex items-center gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="pams-page-action-outline"
          onClick={onExport}
          disabled={exportDisabled}
        >
          <Download />
          {t("toolbar.export")}
        </Button>
      </div>
    </div>
  );
};
