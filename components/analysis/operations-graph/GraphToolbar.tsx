"use client";

import { Download } from "lucide-react";
import { useTranslations } from "next-intl";

import { panelTitleBarShellClass } from "@/components/common/layout/panel-styles";
import { SearchBar } from "@/components/common/SearchBar";
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

type LayerToggleProps = {
  pressed: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title: string;
};

const LayerToggle = ({
  pressed,
  onClick,
  children,
  title,
}: LayerToggleProps) => (
  <button
    type="button"
    className="pams-graph-toolbar__toggle"
    aria-pressed={pressed}
    title={title}
    onClick={onClick}
  >
    {children}
  </button>
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
    <div className={cn(panelTitleBarShellClass, "pams-graph-toolbar")}>
      <div className="pams-graph-toolbar__track">
        <div className="pams-graph-toolbar__group">
          <SearchBar
            value={searchTerm}
            onChange={onSearchChange}
            placeholder={t("toolbar.searchPlaceholder")}
            variant="filter"
            className="pams-graph-toolbar__search"
          />
        </div>

        <div className="pams-graph-toolbar__divider" aria-hidden />

        <div className="pams-graph-toolbar__group pams-graph-toolbar__group--labeled">
          <span className="pams-graph-toolbar__group-label">
            {t("toolbar.filterGroup")}
          </span>
          <div
            className="pams-graph-toolbar__segment"
            role="group"
            aria-label={t("toolbar.filterGroup")}
          >
            <LayerToggle
              pressed={showGraph}
              onClick={() => onShowGraphChange(!showGraph)}
              title={t("toolbar.toggleGraph")}
            >
              {t("toolbar.graph")}
            </LayerToggle>
            <LayerToggle
              pressed={showInterfaces}
              onClick={() => onShowInterfacesChange(!showInterfaces)}
              title={t("toolbar.toggleInterfaces")}
            >
              {t("toolbar.interfaces")}
            </LayerToggle>
            <LayerToggle
              pressed={showTables}
              onClick={() => onShowTablesChange(!showTables)}
              title={t("toolbar.toggleTables")}
            >
              {t("toolbar.tables")}
            </LayerToggle>
            <LayerToggle
              pressed={highlightCritical}
              onClick={() => onHighlightCriticalChange(!highlightCritical)}
              title={t("toolbar.toggleCritical")}
            >
              {t("toolbar.critical")}
            </LayerToggle>
          </div>
        </div>

        <div className="pams-graph-toolbar__divider" aria-hidden />

        <div
          className="pams-graph-toolbar__group pams-graph-toolbar__group--labeled"
          aria-label={t("toolbar.viewGroup")}
        >
          <span className="pams-graph-toolbar__group-label">
            {t("toolbar.viewGroup")}
          </span>
          <Select
            value={viewMode}
            onValueChange={(value) =>
              onViewModeChange(value as GraphViewMode)
            }
          >
            <SelectTrigger
              variant="filter"
              className="pams-graph-toolbar__select"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent variant="filter">
              <SelectItem variant="filter" value="hierarchical">
                {t("toolbar.viewHierarchical")}
              </SelectItem>
              <SelectItem variant="filter" value="radial">
                {t("toolbar.viewRadial")}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="pams-graph-toolbar__actions">
        <button
          type="button"
          className="pams-graph-toolbar__export"
          onClick={onExport}
          disabled={exportDisabled}
          title={t("toolbar.export")}
        >
          <Download aria-hidden />
          {t("toolbar.export")}
        </button>
      </div>
    </div>
  );
};
