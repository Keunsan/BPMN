import dagre from "@dagrejs/dagre";
import type { Edge, Node } from "@xyflow/react";

import type { GraphViewMode } from "@/types/operations-graph";

/** 노드 카드 실측 크기 — dagre 배치 기준 */
export const GRAPH_NODE_WIDTH = 168;
export const GRAPH_NODE_HEIGHT = 64;

/** dagre 기반 노드 좌표 계산 */
export const layoutGraphElements = (
  nodes: Node[],
  edges: Edge[],
  viewMode: GraphViewMode = "hierarchical",
): Node[] => {
  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({
    rankdir: viewMode === "hierarchical" ? "LR" : "TB",
    nodesep: 52,
    ranksep: 80,
    marginx: 40,
    marginy: 40,
  });

  for (const node of nodes) {
    graph.setNode(node.id, {
      width: GRAPH_NODE_WIDTH,
      height: GRAPH_NODE_HEIGHT,
    });
  }

  for (const edge of edges) {
    graph.setEdge(edge.source, edge.target);
  }

  dagre.layout(graph);

  return nodes.map((node) => {
    const position = graph.node(node.id);
    return {
      ...node,
      position: {
        x: position.x - GRAPH_NODE_WIDTH / 2,
        y: position.y - GRAPH_NODE_HEIGHT / 2,
      },
    };
  });
};
