"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  parseAsBoolean,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
  useQueryState,
} from "nuqs";

import { GraphCanvas } from "@/components/analysis/operations-graph/canvas/GraphCanvas";
import { GraphExplorerPanel } from "@/components/analysis/operations-graph/explorer/GraphExplorerPanel";
import { GraphInspectorPanel } from "@/components/analysis/operations-graph/inspector/GraphInspectorPanel";
import { GraphToolbar } from "@/components/analysis/operations-graph/GraphToolbar";
import {
  CollapsibleSidePanel,
  PanelSplitter,
  pamsContentPanelClass,
} from "@/components/common/layout";
import { cn } from "@/lib/utils";
import { useHorizontalPanelResize } from "@/hooks/useHorizontalPanelResize";
import { useOperationsGraph } from "@/lib/query/hooks/useOperationsGraph";
import type {
  GraphNodeKind,
  GraphViewMode,
  OperationsGraphQuery,
} from "@/types/operations-graph";
import { GRAPH_NODE_KINDS } from "@/types/operations-graph";

const DEFAULT_NODE_KINDS = Object.fromEntries(
  GRAPH_NODE_KINDS.map((kind) => [kind, true]),
) as Record<GraphNodeKind, boolean>;

/** 3분할 운영 지식그래프 워크스페이스 */
export const OperationsGraphWorkspace = () => {
  const t = useTranslations("operationsGraph");
  const exportRef = useRef<(() => Promise<void>) | null>(null);

  const [centerNodeId, setCenterNodeId] = useQueryState(
    "centerId",
    parseAsInteger,
  );
  const [centerKind, setCenterKind] = useQueryState(
    "centerKind",
    parseAsStringLiteral(["L3", "TASK", "APPLICATION", "TABLE", "INTERFACE"]).withDefault(
      "L3",
    ),
  );
  const [depth, setDepth] = useQueryState(
    "depth",
    parseAsInteger.withDefault(2),
  );
  const [selectedNodeId, setSelectedNodeId] = useQueryState(
    "selected",
    parseAsString,
  );
  const [leftCollapsed, setLeftCollapsed] = useQueryState(
    "leftCollapsed",
    parseAsBoolean.withDefault(false),
  );
  const [rightCollapsed, setRightCollapsed] = useQueryState(
    "rightCollapsed",
    parseAsBoolean.withDefault(false),
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [showGraph, setShowGraph] = useQueryState(
    "showGraph",
    parseAsBoolean.withDefault(true),
  );
  const [showInterfaces, setShowInterfaces] = useQueryState(
    "showInterfaces",
    parseAsBoolean.withDefault(true),
  );
  const [showTables, setShowTables] = useQueryState(
    "showTables",
    parseAsBoolean.withDefault(true),
  );
  const [highlightCritical, setHighlightCritical] = useQueryState(
    "highlightCritical",
    parseAsBoolean.withDefault(false),
  );
  const [viewMode, setViewMode] = useQueryState(
    "viewMode",
    parseAsStringLiteral(["hierarchical", "radial"] as const).withDefault(
      "hierarchical",
    ),
  );
  const [nodeKinds, setNodeKinds] = useState(DEFAULT_NODE_KINDS);

  const leftPanel = useHorizontalPanelResize({
    storageKey: "pams-ops-graph-left-width",
    defaultWidth: 300,
    minWidth: 240,
    maxWidth: 480,
    enabled: !leftCollapsed,
  });

  const rightPanel = useHorizontalPanelResize({
    storageKey: "pams-ops-graph-right-width",
    defaultWidth: 288,
    minWidth: 220,
    maxWidth: 480,
    enabled: !rightCollapsed,
    side: "right",
  });

  const graphQuery = useMemo<OperationsGraphQuery | null>(() => {
    if (!centerNodeId) {
      return null;
    }
    const enabledKinds = GRAPH_NODE_KINDS.filter((kind) => nodeKinds[kind]);
    return {
      centerKind: centerKind as GraphNodeKind,
      centerId: centerNodeId,
      depth: depth === 1 ? 1 : 2,
      includeKinds: enabledKinds,
      showInterfaces,
      showTables,
      highlightCritical,
    };
  }, [
    centerNodeId,
    centerKind,
    depth,
    nodeKinds,
    showInterfaces,
    showTables,
    highlightCritical,
  ]);

  const { data: graph, isLoading, isFetching } = useOperationsGraph(
    graphQuery,
    Boolean(centerNodeId),
  );

  const handleSelectCenter = useCallback(
    (nodeId: number, level: "L3" | "L4") => {
      void setCenterNodeId(nodeId);
      void setCenterKind(level === "L4" ? "TASK" : "L3");
      void setSelectedNodeId(null);
    },
    [setCenterNodeId, setCenterKind, setSelectedNodeId],
  );

  const handleExport = useCallback(async () => {
    await exportRef.current?.();
  }, []);

  return (
    <div className="pams-ops-graph-workspace flex min-h-0 flex-1 overflow-hidden">
      <CollapsibleSidePanel
        side="left"
        collapsed={leftCollapsed}
        onCollapsedChange={(value) => void setLeftCollapsed(value)}
        width={leftPanel.width}
        title={t("panel.explorer")}
        bodyClassName="p-0"
        className="pams-ops-graph-side-panel"
      >
        <GraphExplorerPanel
          centerNodeId={centerNodeId}
          centerNode={graph?.nodes.find((node) => node.id === graph.centerNodeId)}
          centerKind={centerKind as GraphNodeKind}
          onSelectCenter={handleSelectCenter}
          depth={depth === 1 ? 1 : 2}
          onDepthChange={(value) => void setDepth(value)}
          nodeKinds={nodeKinds}
          onNodeKindChange={(kind, enabled) =>
            setNodeKinds((prev) => ({ ...prev, [kind]: enabled }))
          }
          summary={graph?.summary}
          isLoading={isLoading || isFetching}
        />
      </CollapsibleSidePanel>

      {!leftCollapsed ? (
        <PanelSplitter
          orientation="horizontal"
          onPointerDown={leftPanel.handleResizePointerDown}
          isResizing={leftPanel.isResizing}
          label="Resize explorer panel"
        />
      ) : null}

      <div
        className={cn(
          pamsContentPanelClass,
          "pams-ops-graph-center-panel flex min-h-0 min-w-0 flex-1 flex-col",
        )}
      >
        <GraphToolbar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          showGraph={showGraph}
          onShowGraphChange={(value) => void setShowGraph(value)}
          showInterfaces={showInterfaces}
          onShowInterfacesChange={(value) => void setShowInterfaces(value)}
          showTables={showTables}
          onShowTablesChange={(value) => void setShowTables(value)}
          highlightCritical={highlightCritical}
          onHighlightCriticalChange={(value) => void setHighlightCritical(value)}
          viewMode={viewMode as GraphViewMode}
          onViewModeChange={(value) => void setViewMode(value)}
          onExport={handleExport}
          exportDisabled={!graph || graph.nodes.length === 0}
        />
        <GraphCanvas
          graph={graph}
          isLoading={isLoading || isFetching}
          selectedNodeId={selectedNodeId}
          onSelectNode={(nodeId) => void setSelectedNodeId(nodeId)}
          showGraph={showGraph}
          viewMode={viewMode as GraphViewMode}
          searchTerm={searchTerm}
          onExportReady={(fn) => {
            exportRef.current = fn;
          }}
        />
      </div>

      {!rightCollapsed ? (
        <PanelSplitter
          orientation="horizontal"
          onPointerDown={rightPanel.handleResizePointerDown}
          isResizing={rightPanel.isResizing}
          label="Resize inspector panel"
        />
      ) : null}

      <CollapsibleSidePanel
        side="right"
        collapsed={rightCollapsed}
        onCollapsedChange={(value) => void setRightCollapsed(value)}
        width={rightPanel.width}
        title={t("panel.inspector")}
        bodyClassName="p-0"
        className="pams-ops-graph-side-panel"
      >
        <GraphInspectorPanel
          graph={graph}
          selectedNodeId={selectedNodeId}
          onSelectNode={(nodeId) => void setSelectedNodeId(nodeId)}
        />
      </CollapsibleSidePanel>
    </div>
  );
};
