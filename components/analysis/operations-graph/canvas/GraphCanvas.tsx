"use client";

import {
  Background,
  Controls,
  MarkerType,
  MiniMap,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  useStore,
  type Edge,
  type EdgeMarker,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useTranslations } from "next-intl";
import { toPng } from "html-to-image";

import { EmptyState } from "@/components/common/EmptyState";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import {
  graphEdgeTypes,
  type GraphEdgeData,
} from "@/components/analysis/operations-graph/canvas/GraphEdgeLine";
import {
  GRAPH_MARKER_SIZE,
  resolveMarkerColor,
} from "@/components/analysis/operations-graph/canvas/graph-style-tokens";
import {
  graphNodeTypes,
  type GraphNodeData,
} from "@/components/analysis/operations-graph/canvas/GraphNodeCard";
import { layoutGraphElements } from "@/components/analysis/operations-graph/hooks/useGraphLayout";
import { cn } from "@/lib/utils";
import type {
  GraphEdgeKind,
  GraphNodeKind,
  GraphViewMode,
  OperationsGraphResult,
} from "@/types/operations-graph";

import "../operations-graph.css";

type GraphCanvasProps = {
  graph?: OperationsGraphResult;
  isLoading: boolean;
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string | null) => void;
  showGraph: boolean;
  viewMode: GraphViewMode;
  searchTerm: string;
  onExportReady?: (exportFn: () => Promise<void>) => void;
};

const MINIMAP_KIND_COLORS: Record<string, string> = {
  L3: "oklch(0.48 0.22 293)",
  TASK: "oklch(0.42 0.16 293)",
  APPLICATION: "oklch(0.46 0.14 250)",
  TABLE: "oklch(0.58 0.12 75)",
  INTERFACE: "oklch(0.5 0.12 195)",
};

const toFlowNodes = (
  graph: OperationsGraphResult,
  selectedNodeId: string | null,
  searchTerm: string,
): Node<GraphNodeData>[] => {
  const relatedIds = new Set<string>();
  if (selectedNodeId) {
    relatedIds.add(selectedNodeId);
    for (const edge of graph.edges) {
      if (edge.source === selectedNodeId) {
        relatedIds.add(edge.target);
      }
      if (edge.target === selectedNodeId) {
        relatedIds.add(edge.source);
      }
    }
  }

  return graph.nodes.map((node) => ({
    id: node.id,
    type: "graphNode",
    position: { x: 0, y: 0 },
    data: {
      label: node.label,
      code: node.code,
      kind: node.kind,
      status: node.status,
      isCritical: node.isCritical,
      viaCallActivity: Boolean(node.meta?.viaCallActivity),
      highlighted:
        Boolean(node.meta?.highlighted) ||
        (searchTerm.length > 0 &&
          (node.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
            node.code?.toLowerCase().includes(searchTerm.toLowerCase()))),
      dimmed: Boolean(selectedNodeId) && !relatedIds.has(node.id),
    },
    selected: node.id === selectedNodeId,
  }));
};

const buildEdgeMarkerEnd = (
  kind: GraphEdgeKind,
  isActive: boolean,
  isDimmed: boolean,
): EdgeMarker | undefined => {
  if (kind === "CONTAINS") {
    return undefined;
  }

  const color = resolveMarkerColor(kind, isActive, isDimmed);
  const size =
    kind === "PRECEDES"
      ? GRAPH_MARKER_SIZE.precedes
      : GRAPH_MARKER_SIZE.default;

  return {
    type: MarkerType.ArrowClosed,
    width: size.width,
    height: size.height,
    color,
  };
};

const CHAIN_EDGE_KINDS = new Set([
  "USES_SCREEN",
  "READS_TABLE",
  "WRITES_TABLE",
  "INTERFACE",
]);

const getChainHandles = (
  kind: GraphEdgeKind,
  viewMode: GraphViewMode,
  sourceKind: GraphNodeKind | undefined,
  targetKind: GraphNodeKind | undefined,
): { sourceHandle?: string; targetHandle?: string } => {
  if (!CHAIN_EDGE_KINDS.has(kind)) {
    return {};
  }

  if (viewMode === "radial") {
    if (sourceKind === "TASK" && targetKind === "APPLICATION") {
      return { sourceHandle: "chain-out-h", targetHandle: "flow-in" };
    }
    return { sourceHandle: "flow-out", targetHandle: "flow-in" };
  }

  return { sourceHandle: "chain-out", targetHandle: "chain-in" };
};

const RESOURCE_FLOW_KINDS = new Set<GraphNodeKind>(["APPLICATION", "TABLE"]);

const PROCESS_FLOW_KINDS = new Set<GraphNodeKind>(["E2E", "L3", "TASK"]);

/** PRECEDES 엣지 — 뷰 모드별 handle 분기 */
const getPrecedesHandles = (
  kind: GraphEdgeKind,
  sourceId: string,
  targetId: string,
  nodeKindById: Map<string, GraphNodeKind>,
  viewMode: GraphViewMode,
): { sourceHandle?: string; targetHandle?: string } => {
  if (kind !== "PRECEDES") {
    return {};
  }
  const sourceKind = nodeKindById.get(sourceId);
  const targetKind = nodeKindById.get(targetId);
  if (!sourceKind || !targetKind) {
    return {};
  }

  const isResourceFlow =
    RESOURCE_FLOW_KINDS.has(sourceKind) &&
    RESOURCE_FLOW_KINDS.has(targetKind);
  const isProcessFlow =
    PROCESS_FLOW_KINDS.has(sourceKind) &&
    PROCESS_FLOW_KINDS.has(targetKind);

  if (!isResourceFlow && !isProcessFlow) {
    return {};
  }

  if (viewMode === "radial") {
    if (isProcessFlow) {
      return { sourceHandle: "flow-out-v", targetHandle: "flow-in-v" };
    }
    if (
      (sourceKind === "APPLICATION" && targetKind === "APPLICATION") ||
      (sourceKind === "TABLE" && targetKind === "TABLE")
    ) {
      return { sourceHandle: "flow-out-v", targetHandle: "flow-in-v" };
    }
  }

  return { sourceHandle: "flow-out", targetHandle: "flow-in" };
};

const toFlowEdges = (
  graph: OperationsGraphResult,
  selectedNodeId: string | null,
  viewMode: GraphViewMode,
  options?: { includeContains?: boolean },
): Edge<GraphEdgeData>[] => {
  const includeContains = options?.includeContains ?? false;
  const nodeKindById = new Map(graph.nodes.map((node) => [node.id, node.kind]));

  return graph.edges
    .filter((edge) => includeContains || edge.kind !== "CONTAINS")
    .map((edge) => {
    const isActive =
      Boolean(selectedNodeId) &&
      (edge.source === selectedNodeId || edge.target === selectedNodeId);
    const isDimmed =
      Boolean(selectedNodeId) &&
      edge.source !== selectedNodeId &&
      edge.target !== selectedNodeId;
    const chainHandles = getChainHandles(
      edge.kind,
      viewMode,
      nodeKindById.get(edge.source),
      nodeKindById.get(edge.target),
    );
    const precedesHandles = getPrecedesHandles(
      edge.kind,
      edge.source,
      edge.target,
      nodeKindById,
      viewMode,
    );
    const flowHandles =
      edge.kind === "PRECEDES" ? precedesHandles : chainHandles;

    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      ...flowHandles,
      type: "graphEdge",
      markerEnd: buildEdgeMarkerEnd(edge.kind, isActive, isDimmed),
      data: {
        kind: edge.kind,
        label: edge.label,
        isActive,
        isDimmed,
      },
    };
  });
};

type CanvasStatusBarProps = {
  viewMode: GraphViewMode;
  nodeCount?: number;
  edgeCount?: number;
  selectedLabel?: string;
  zoomPercent?: number;
};

const CanvasStatusBar = ({
  viewMode,
  nodeCount,
  edgeCount,
  selectedLabel,
  zoomPercent = 100,
}: CanvasStatusBarProps) => {
  const t = useTranslations("operationsGraph");

  return (
    <div className="pams-operations-graph-canvas-status" aria-live="polite">
      <div className="pams-operations-graph-canvas-status__left">
        <span className="pams-operations-graph-canvas-status__item">
          {t(`toolbar.view${viewMode === "hierarchical" ? "Hierarchical" : "Radial"}`)}
        </span>
        {nodeCount !== undefined && edgeCount !== undefined ? (
          <>
            <span className="pams-operations-graph-canvas-status__sep" aria-hidden>
              ·
            </span>
            <span className="pams-operations-graph-canvas-status__item">
              {t("canvas.statusNodes", { count: nodeCount })}
            </span>
            <span className="pams-operations-graph-canvas-status__sep" aria-hidden>
              ·
            </span>
            <span className="pams-operations-graph-canvas-status__item">
              {t("canvas.statusEdges", { count: edgeCount })}
            </span>
          </>
        ) : null}
      </div>
      <div className="pams-operations-graph-canvas-status__right">
        {selectedLabel ? (
          <>
            <span className="pams-operations-graph-canvas-status__item pams-operations-graph-canvas-status__item--selected">
              {t("canvas.statusSelected", { label: selectedLabel })}
            </span>
            <span className="pams-operations-graph-canvas-status__sep" aria-hidden>
              ·
            </span>
          </>
        ) : null}
        <span className="pams-operations-graph-canvas-status__item">
          {t("canvas.statusZoom", { percent: zoomPercent })}
        </span>
      </div>
    </div>
  );
};

const ActiveCanvasStatusBar = (
  props: Omit<CanvasStatusBarProps, "zoomPercent">,
) => {
  const zoomPercent = useStore((state) => Math.round(state.transform[2] * 100));
  return <CanvasStatusBar {...props} zoomPercent={zoomPercent} />;
};

const GraphCanvasInner = ({
  graph,
  isLoading,
  selectedNodeId,
  onSelectNode,
  showGraph,
  viewMode,
  searchTerm,
  onExportReady,
}: GraphCanvasProps) => {
  const t = useTranslations("operationsGraph");
  const containerRef = useRef<HTMLDivElement>(null);
  const { fitView } = useReactFlow();

  const rawNodes = useMemo(
    () => (graph ? toFlowNodes(graph, selectedNodeId, searchTerm) : []),
    [graph, selectedNodeId, searchTerm],
  );
  const layoutEdges = useMemo(
    () =>
      graph
        ? toFlowEdges(graph, selectedNodeId, viewMode, { includeContains: true })
        : [],
    [graph, selectedNodeId, viewMode],
  );
  const visibleEdges = useMemo(
    () =>
      graph
        ? toFlowEdges(graph, selectedNodeId, viewMode, { includeContains: false })
        : [],
    [graph, selectedNodeId, viewMode],
  );

  const layoutNodes = useMemo(
    () => layoutGraphElements(rawNodes, layoutEdges, viewMode),
    [rawNodes, layoutEdges, viewMode],
  );

  const selectedNodeLabel = useMemo(() => {
    if (!graph || !selectedNodeId) {
      return undefined;
    }
    return graph.nodes.find((node) => node.id === selectedNodeId)?.label;
  }, [graph, selectedNodeId]);

  useEffect(() => {
    if (!graph || graph.nodes.length === 0) {
      return;
    }
    const timer = window.setTimeout(() => {
      void fitView({ padding: 0.2, duration: 280 });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fitView, graph, viewMode]);

  const handleExport = useCallback(async () => {
    const viewport = containerRef.current?.querySelector(".react-flow__viewport");
    if (!viewport || !(viewport instanceof HTMLElement)) {
      return;
    }
    const dataUrl = await toPng(viewport, {
      backgroundColor: "#fafbfc",
      pixelRatio: 2,
    });
    const link = document.createElement("a");
    link.download = "operations-graph.png";
    link.href = dataUrl;
    link.click();
  }, []);

  useEffect(() => {
    onExportReady?.(handleExport);
  }, [handleExport, onExportReady]);

  if (!showGraph) {
    return (
      <>
        <div className="pams-operations-graph-canvas pams-operations-graph-canvas--idle flex items-center justify-center">
          <EmptyState
            title={t("canvas.hiddenTitle")}
            description={t("canvas.hiddenDescription")}
          />
        </div>
        <CanvasStatusBar viewMode={viewMode} />
      </>
    );
  }

  if (isLoading) {
    return (
      <>
        <div className="pams-operations-graph-canvas pams-operations-graph-canvas--idle flex items-center justify-center">
          <LoadingSpinner label={t("canvas.loading")} />
        </div>
        <CanvasStatusBar viewMode={viewMode} />
      </>
    );
  }

  if (!graph || graph.nodes.length === 0) {
    return (
      <>
        <div className="pams-operations-graph-canvas pams-operations-graph-canvas--idle flex items-center justify-center">
          <EmptyState
            title={t("canvas.emptyTitle")}
            description={t("canvas.emptyDescription")}
          />
        </div>
        <CanvasStatusBar viewMode={viewMode} />
      </>
    );
  }

  return (
    <>
      <div
        ref={containerRef}
        className={cn(
          "pams-operations-graph-canvas",
          viewMode === "hierarchical" &&
            "pams-operations-graph-canvas--hierarchical",
        )}
      >
        <ReactFlow
          nodes={layoutNodes}
          edges={visibleEdges}
          nodeTypes={graphNodeTypes}
          edgeTypes={graphEdgeTypes}
          minZoom={0.2}
          maxZoom={1.8}
          defaultEdgeOptions={{ zIndex: 0 }}
          elevateEdgesOnSelect
          elevateNodesOnSelect
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable
          panOnScroll
          zoomOnScroll
          proOptions={{ hideAttribution: true }}
          onNodeClick={(_, node) => onSelectNode(node.id)}
          onPaneClick={() => onSelectNode(null)}
        >
          <Background
            gap={24}
            size={1}
            color="oklch(0.78 0.008 280 / 0.42)"
          />

          <Panel position="top-left" className="pams-operations-graph-canvas-meta">
            <span>
              {t("canvas.metaSummary", {
                nodes: graph.summary.nodeCount,
                edges: visibleEdges.length,
              })}
            </span>
            {graph.summary.truncated ? (
              <span className="pams-operations-graph-canvas-meta__note">
                {t("explorer.truncated")}
              </span>
            ) : null}
          </Panel>

          <Controls
            showInteractive={false}
            position="bottom-left"
            className="pams-operations-graph-controls"
          />

          <MiniMap
            pannable
            zoomable
            position="bottom-right"
            className="pams-operations-graph-minimap"
            maskColor="oklch(0.97 0.003 280 / 0.62)"
            maskStrokeColor="oklch(0.45 0.2 293 / 0.55)"
            nodeColor={(node) => {
              const kind = (node.data as GraphNodeData | undefined)?.kind;
              return kind
                ? (MINIMAP_KIND_COLORS[kind] ?? "oklch(0.55 0.02 280)")
                : "oklch(0.55 0.02 280)";
            }}
            nodeStrokeColor={() => "oklch(0.72 0.01 280 / 0.85)"}
            nodeStrokeWidth={1.25}
            nodeBorderRadius={4}
          />
        </ReactFlow>
      </div>
      <ActiveCanvasStatusBar
        viewMode={viewMode}
        nodeCount={graph.summary.nodeCount}
        edgeCount={visibleEdges.length}
        selectedLabel={selectedNodeLabel}
      />
    </>
  );
};

/** React Flow 기반 운영 지식그래프 캔버스 */
export const GraphCanvas = (props: GraphCanvasProps) => (
  <ReactFlowProvider>
    <GraphCanvasInner {...props} />
  </ReactFlowProvider>
);
