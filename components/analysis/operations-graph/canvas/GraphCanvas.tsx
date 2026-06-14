"use client";

import {
  Background,
  Controls,
  MiniMap,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
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
  graphNodeTypes,
  type GraphNodeData,
} from "@/components/analysis/operations-graph/canvas/GraphNodeCard";
import { layoutGraphElements } from "@/components/analysis/operations-graph/hooks/useGraphLayout";
import type {
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
  L3: "oklch(0.52 0.24 293 / 0.72)",
  TASK: "oklch(0.55 0.02 280 / 0.72)",
  APPLICATION: "oklch(0.55 0.14 250 / 0.72)",
  TABLE: "oklch(0.68 0.14 75 / 0.72)",
  INTERFACE: "oklch(0.62 0.1 195 / 0.72)",
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

const toFlowEdges = (
  graph: OperationsGraphResult,
  selectedNodeId: string | null,
): Edge<GraphEdgeData>[] =>
  graph.edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: "graphEdge",
    data: {
      kind: edge.kind,
      label: edge.label,
      isActive:
        Boolean(selectedNodeId) &&
        (edge.source === selectedNodeId || edge.target === selectedNodeId),
      isDimmed:
        Boolean(selectedNodeId) &&
        edge.source !== selectedNodeId &&
        edge.target !== selectedNodeId,
    },
  }));

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
  const rawEdges = useMemo(
    () => (graph ? toFlowEdges(graph, selectedNodeId) : []),
    [graph, selectedNodeId],
  );

  const layoutNodes = useMemo(
    () => layoutGraphElements(rawNodes, rawEdges, viewMode),
    [rawNodes, rawEdges, viewMode],
  );

  useEffect(() => {
    if (!graph || graph.nodes.length === 0) {
      return;
    }
    const timer = window.setTimeout(() => {
      void fitView({ padding: 0.18, duration: 280 });
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
      <div className="pams-operations-graph-canvas flex items-center justify-center">
        <EmptyState
          title={t("canvas.hiddenTitle")}
          description={t("canvas.hiddenDescription")}
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="pams-operations-graph-canvas flex items-center justify-center">
        <LoadingSpinner label={t("canvas.loading")} />
      </div>
    );
  }

  if (!graph || graph.nodes.length === 0) {
    return (
      <div className="pams-operations-graph-canvas flex items-center justify-center">
        <EmptyState
          title={t("canvas.emptyTitle")}
          description={t("canvas.emptyDescription")}
        />
      </div>
    );
  }

  return (
    <div ref={containerRef} className="pams-operations-graph-canvas">
      <ReactFlow
        nodes={layoutNodes}
        edges={rawEdges}
        nodeTypes={graphNodeTypes}
        edgeTypes={graphEdgeTypes}
        minZoom={0.25}
        maxZoom={1.6}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable
        panOnScroll
        zoomOnScroll
        proOptions={{ hideAttribution: true }}
        onNodeClick={(_, node) => onSelectNode(node.id)}
        onPaneClick={() => onSelectNode(null)}
      >
        <defs>
          <marker
            id="pams-graph-arrow"
            markerWidth="7"
            markerHeight="7"
            refX="5.5"
            refY="3.5"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path
              d="M0,0 L7,3.5 L0,7 Z"
              fill="oklch(0.78 0.008 280 / 0.42)"
            />
          </marker>
          <marker
            id="pams-graph-arrow-active"
            markerWidth="7"
            markerHeight="7"
            refX="5.5"
            refY="3.5"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path
              d="M0,0 L7,3.5 L0,7 Z"
              fill="oklch(0.52 0.24 293 / 0.62)"
            />
          </marker>
        </defs>

        <Background
          gap={28}
          size={0.75}
          color="oklch(0.86 0.006 280 / 0.22)"
        />

        <Panel position="top-left" className="pams-operations-graph-canvas-meta">
          <span>
            {t("canvas.metaSummary", {
              nodes: graph.summary.nodeCount,
              edges: graph.summary.edgeCount,
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
          maskColor="oklch(0.98 0.003 280 / 0.55)"
          maskStrokeColor="oklch(0.52 0.24 293 / 0.28)"
          nodeColor={(node) => {
            const kind = (node.data as GraphNodeData | undefined)?.kind;
            return kind
              ? (MINIMAP_KIND_COLORS[kind] ?? "oklch(0.72 0.01 280 / 0.5)")
              : "oklch(0.72 0.01 280 / 0.5)";
          }}
          nodeStrokeColor={() => "oklch(0.88 0.008 280 / 0.6)"}
          nodeStrokeWidth={0.75}
        />
      </ReactFlow>
    </div>
  );
};

/** React Flow 기반 운영 지식그래프 캔버스 */
export const GraphCanvas = (props: GraphCanvasProps) => (
  <ReactFlowProvider>
    <GraphCanvasInner {...props} />
  </ReactFlowProvider>
);
