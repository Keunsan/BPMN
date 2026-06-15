import "server-only";

import { ApiError } from "@/lib/api/error-handler";
import * as e2eQueries from "@/lib/db/queries/e2e-process";
import * as graphQueries from "@/lib/db/queries/operations-graph";
import type {
  GraphEdgeKind,
  GraphNodeKind,
  OperationsGraphEdge,
  OperationsGraphNode,
  OperationsGraphQuery,
  OperationsGraphResult,
  OperationsGraphSummary,
} from "@/types/operations-graph";
import {
  buildGraphNodeId,
  GRAPH_NODE_KINDS,
} from "@/types/operations-graph";

const MAX_NODES = 200;

type QueueItem = {
  kind: GraphNodeKind;
  sourceId: number | string;
  depth: number;
};

const mergeNodes = (
  target: Map<string, OperationsGraphNode>,
  nodes: OperationsGraphNode[],
) => {
  for (const node of nodes) {
    if (!target.has(node.id)) {
      target.set(node.id, node);
    }
  }
};

const mergeEdges = (
  target: Map<string, OperationsGraphEdge>,
  edges: OperationsGraphEdge[],
) => {
  for (const edge of edges) {
    if (!target.has(edge.id)) {
      target.set(edge.id, edge);
    }
  }
};

const filterByKinds = (
  nodes: OperationsGraphNode[],
  edges: OperationsGraphEdge[],
  includeKinds?: GraphNodeKind[],
  includeEdgeKinds?: GraphEdgeKind[],
  options?: {
    showInterfaces?: boolean;
    showTables?: boolean;
    highlightCritical?: boolean;
    centerNodeId?: string;
    centerKind?: GraphNodeKind;
  },
): { nodes: OperationsGraphNode[]; edges: OperationsGraphEdge[] } => {
  const kindSet = includeKinds
    ? new Set(includeKinds)
    : new Set(GRAPH_NODE_KINDS);

  if (options?.showInterfaces === false) {
    kindSet.delete("INTERFACE");
  }
  if (options?.showTables === false) {
    kindSet.delete("TABLE");
  }

  const includedIds = new Set<string>();

  for (const node of nodes) {
    if (kindSet.has(node.kind)) {
      includedIds.add(node.id);
    }
  }

  if (options?.centerKind) {
    let changed = true;
    while (changed) {
      changed = false;
      for (const node of nodes) {
        if (node.kind !== options.centerKind || node.id === options.centerNodeId) {
          continue;
        }
        if (includedIds.has(node.id)) {
          continue;
        }
        const connected = edges.some(
          (edge) =>
            (edge.source === node.id && includedIds.has(edge.target)) ||
            (edge.target === node.id && includedIds.has(edge.source)),
        );
        if (connected) {
          includedIds.add(node.id);
          changed = true;
        }
      }
    }
  }

  const filteredNodes = nodes.filter((node) => includedIds.has(node.id));
  const nodeIdSet = new Set(filteredNodes.map((node) => node.id));

  const edgeKindSet = includeEdgeKinds
    ? new Set(includeEdgeKinds)
    : undefined;

  const filteredEdges = edges.filter((edge) => {
    if (!nodeIdSet.has(edge.source) || !nodeIdSet.has(edge.target)) {
      return false;
    }
    if (edgeKindSet && !edgeKindSet.has(edge.kind)) {
      return false;
    }
    if (options?.showInterfaces === false && edge.kind === "INTERFACE") {
      return false;
    }
    if (
      options?.showTables === false &&
      (edge.kind === "READS_TABLE" || edge.kind === "WRITES_TABLE")
    ) {
      return false;
    }
    return true;
  });

  return { nodes: filteredNodes, edges: filteredEdges };
};

const excludeCenterFromGraph = (
  nodes: OperationsGraphNode[],
  edges: OperationsGraphEdge[],
  centerNodeId: string,
): { nodes: OperationsGraphNode[]; edges: OperationsGraphEdge[] } => ({
  nodes: nodes.filter((node) => node.id !== centerNodeId),
  edges: edges.filter(
    (edge) => edge.source !== centerNodeId && edge.target !== centerNodeId,
  ),
});

const buildSummary = (
  nodes: OperationsGraphNode[],
  edges: OperationsGraphEdge[],
  truncated: boolean,
): OperationsGraphSummary => {
  const countsByKind: Partial<Record<GraphNodeKind, number>> = {};
  for (const node of nodes) {
    countsByKind[node.kind] = (countsByKind[node.kind] ?? 0) + 1;
  }
  return {
    nodeCount: nodes.length,
    edgeCount: edges.length,
    countsByKind,
    truncated,
  };
};

/** 중심 노드 기준 BFS 서브그래프를 조합한다 */
export const buildOperationsGraph = async (
  query: OperationsGraphQuery,
): Promise<OperationsGraphResult> => {
  const {
    centerKind,
    centerId,
    centerProcessLevel,
    depth,
    includeKinds,
    includeEdgeKinds,
    showInterfaces = true,
    showTables = true,
    highlightCritical = false,
  } = query;

  const isScopeCenter =
    centerProcessLevel === "L1" || centerProcessLevel === "L2";
  const filterAnchorKind: GraphNodeKind | undefined =
    centerProcessLevel === "L3"
      ? "L3"
      : centerKind === "TASK"
        ? "TASK"
        : undefined;

  const nodeMap = new Map<string, OperationsGraphNode>();
  const edgeMap = new Map<string, OperationsGraphEdge>();
  const visited = new Set<string>();
  const queue: QueueItem[] = [
    { kind: centerKind, sourceId: centerId, depth: 0 },
  ];

  let truncated = false;
  let centerNodeMeta: OperationsGraphNode | undefined;

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || current.depth > depth) {
      continue;
    }

    const visitKey = `${current.kind}:${current.sourceId}`;
    if (visited.has(visitKey)) {
      continue;
    }
    visited.add(visitKey);

    if (nodeMap.size >= MAX_NODES) {
      truncated = true;
      break;
    }

    let bundle: graphQueries.GraphNeighborBundle = { nodes: [], edges: [] };

    if (current.kind === "E2E") {
      const e2eProcessId = Number(current.sourceId);
      if (!Number.isFinite(e2eProcessId)) {
        throw new ApiError("E001", "Invalid E2E process id", 400);
      }

      if (current.depth === 0) {
        const e2e = await graphQueries.findGraphE2eProcess(e2eProcessId);
        if (!e2e) {
          throw new ApiError("E404", "E2E process not found", 404);
        }
        const modelId =
          await e2eQueries.findCurrentBpmnModelIdByE2eProcessId(e2eProcessId);
        centerNodeMeta = {
          id: buildGraphNodeId("E2E", e2e.e2eProcessId),
          kind: "E2E",
          label: e2e.name,
          code: e2e.code,
          status: e2e.status,
          sourceId: e2e.e2eProcessId,
          meta: { e2eProcessId: e2e.e2eProcessId, modelId },
        };
      }

      bundle = await graphQueries.collectE2eGraphNeighbors(e2eProcessId, {
        showInterfaces,
        showTables,
        includeL3Children: current.depth >= 1,
      });
    } else if (current.kind === "L3" || current.kind === "TASK") {
      const nodeId = Number(current.sourceId);
      if (!Number.isFinite(nodeId)) {
        throw new ApiError("E001", "Invalid center node id", 400);
      }

      if (current.depth === 0) {
        const processNode = await graphQueries.findGraphProcessNode(nodeId);
        if (!processNode) {
          throw new ApiError("E404", "Process node not found", 404);
        }
        const centerGraphKind: GraphNodeKind =
          processNode.level === "L4" ? "TASK" : "L3";
        centerNodeMeta = {
          id: buildGraphNodeId(centerGraphKind, processNode.nodeId),
          kind: centerGraphKind,
          label: processNode.name,
          code: processNode.code,
          status: processNode.status,
          sourceId: processNode.nodeId,
          meta: isScopeCenter
            ? { processLevel: centerProcessLevel }
            : undefined,
        };
      }

      if (current.depth === 0 && isScopeCenter) {
        bundle = await graphQueries.collectProcessScopeNeighbors(nodeId, {
          showInterfaces,
          showTables,
        });
      } else {
        bundle = await graphQueries.collectProcessNeighbors(
          nodeId,
          current.kind === "L3" ? "L3" : "L4",
          { showInterfaces, showTables },
        );
      }
    } else if (current.kind === "APPLICATION") {
      const systemId = Number(current.sourceId);
      if (!Number.isFinite(systemId)) {
        throw new ApiError("E001", "Invalid system id", 400);
      }
      bundle = await graphQueries.collectApplicationNeighbors(systemId, {
        showInterfaces,
      });
    } else if (current.kind === "TABLE") {
      const parts = String(current.sourceId).split(":");
      if (parts.length < 2) {
        throw new ApiError("E001", "Invalid table id", 400);
      }
      const systemId = Number(parts[0]);
      const tableName = parts.length >= 3 ? parts.slice(2).join(":") : parts[1];
      const schemaName = parts.length >= 3 ? parts[1] || null : null;

      bundle = await graphQueries.collectTableNeighbors(
        systemId,
        schemaName,
        tableName,
      );
    } else {
      continue;
    }

    mergeNodes(nodeMap, bundle.nodes);
    mergeEdges(edgeMap, bundle.edges);

    if (current.depth < depth) {
      for (const node of bundle.nodes) {
        if (node.id === buildGraphNodeId(centerKind, centerId)) {
          continue;
        }
        queue.push({
          kind: node.kind,
          sourceId: node.sourceId,
          depth: current.depth + 1,
        });
      }
    }
  }

  let nodes = Array.from(nodeMap.values());
  const edges = Array.from(edgeMap.values());

  if (highlightCritical) {
    nodes = nodes.map((node) =>
      node.kind === "TABLE" && node.isCritical
        ? { ...node, meta: { ...node.meta, highlighted: true } }
        : node,
    );
  }

  const centerNodeId = buildGraphNodeId(centerKind, centerId);

  const filtered = filterByKinds(
    nodes,
    edges,
    includeKinds,
    includeEdgeKinds,
    {
      showInterfaces,
      showTables,
      highlightCritical,
      centerNodeId,
      centerKind: filterAnchorKind,
    },
  );

  const withoutCenter = excludeCenterFromGraph(
    filtered.nodes,
    filtered.edges,
    centerNodeId,
  );

  return {
    nodes: withoutCenter.nodes,
    edges: withoutCenter.edges,
    summary: buildSummary(
      withoutCenter.nodes,
      withoutCenter.edges,
      truncated,
    ),
    centerNodeId,
    centerNode: centerNodeMeta,
  };
};

/** 선택 노드 상세 정보를 조합한다 */
export const getGraphNodeDetail = async (
  nodeId: string,
  graph: OperationsGraphResult,
): Promise<{
  node: OperationsGraphNode | null;
  relatedNodes: Array<{
    id: string;
    kind: GraphNodeKind;
    label: string;
    code?: string;
  }>;
  description?: string;
}> => {
  const node = graph.nodes.find((item) => item.id === nodeId) ?? null;
  if (!node) {
    return { node: null, relatedNodes: [] };
  }

  const relatedIds = new Set<string>();
  for (const edge of graph.edges) {
    if (edge.source === nodeId) {
      relatedIds.add(edge.target);
    }
    if (edge.target === nodeId) {
      relatedIds.add(edge.source);
    }
  }

  const relatedNodes = graph.nodes
    .filter((item) => relatedIds.has(item.id))
    .map((item) => ({
      id: item.id,
      kind: item.kind,
      label: item.label,
      code: item.code,
    }));

  let description: string | undefined;
  if (node.kind === "E2E") {
    const e2e = await graphQueries.findGraphE2eProcess(Number(node.sourceId));
    description = e2e?.name;
  } else if (node.kind === "TASK" || node.kind === "L3") {
    const processNode = await graphQueries.findGraphProcessNode(
      Number(node.sourceId),
    );
    description = processNode?.name;
  }

  return { node, relatedNodes, description };
};
