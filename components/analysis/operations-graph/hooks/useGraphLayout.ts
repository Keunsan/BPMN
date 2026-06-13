import dagre from "@dagrejs/dagre";
import type { Edge, Node } from "@xyflow/react";

import type { GraphViewMode } from "@/types/operations-graph";

const NODE_WIDTH = 148;
const NODE_HEIGHT = 52;

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
    nodesep: 48,
    ranksep: 72,
    marginx: 32,
    marginy: 32,
  });

  for (const node of nodes) {
    graph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
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
        x: position.x - NODE_WIDTH / 2,
        y: position.y - NODE_HEIGHT / 2,
      },
    };
  });
};
