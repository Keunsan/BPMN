"use client";

import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
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

const toFlowNodes = (
  graph: OperationsGraphResult,
  selectedNodeId: string | null,
  searchTerm: string,
): Node<GraphNodeData>[] =>
  graph.nodes.map((node) => ({
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
    },
    selected: node.id === selectedNodeId,
  }));

const toFlowEdges = (graph: OperationsGraphResult): Edge<GraphEdgeData>[] =>
  graph.edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: "graphEdge",
    data: { kind: edge.kind, label: edge.label },
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

  const rawNodes = useMemo(
    () => (graph ? toFlowNodes(graph, selectedNodeId, searchTerm) : []),
    [graph, selectedNodeId, searchTerm],
  );
  const rawEdges = useMemo(
    () => (graph ? toFlowEdges(graph) : []),
    [graph],
  );

  const layoutNodes = useMemo(
    () => layoutGraphElements(rawNodes, rawEdges, viewMode),
    [rawNodes, rawEdges, viewMode],
  );

  const handleExport = useCallback(async () => {
    const viewport = containerRef.current?.querySelector(".react-flow__viewport");
    if (!viewport || !(viewport instanceof HTMLElement)) {
      return;
    }
    const dataUrl = await toPng(viewport, {
      backgroundColor: "#ffffff",
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
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
        maxZoom={1.8}
        proOptions={{ hideAttribution: true }}
        onNodeClick={(_, node) => onSelectNode(node.id)}
        onPaneClick={() => onSelectNode(null)}
      >
        <defs>
          <marker
            id="pams-graph-arrow"
            markerWidth="8"
            markerHeight="8"
            refX="6"
            refY="3"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M0,0 L6,3 L0,6 Z" fill="oklch(0.72 0.01 280 / 0.55)" />
          </marker>
        </defs>
        <Background gap={20} size={0.5} color="oklch(0.82 0.01 280 / 0.45)" />
        <Controls
          showInteractive={false}
          className="!rounded-lg !border !border-slate-200/85 !bg-white/95 !shadow-sm dark:!border-slate-600/65 dark:!bg-slate-900/90"
        />
        <MiniMap
          pannable
          zoomable
          className="!rounded-lg !border !border-slate-200/85 !bg-white/95 dark:!border-slate-600/65 dark:!bg-slate-900/90"
          nodeColor={(node) => {
            const kind = (node.data as GraphNodeData | undefined)?.kind;
            const colors: Record<string, string> = {
              L3: "oklch(0.52 0.24 293)",
              TASK: "oklch(0.55 0.02 280)",
              APPLICATION: "oklch(0.55 0.14 250)",
              TABLE: "oklch(0.68 0.14 75)",
              INTERFACE: "oklch(0.62 0.1 195)",
            };
            return kind ? (colors[kind] ?? "#94a3b8") : "#94a3b8";
          }}
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
