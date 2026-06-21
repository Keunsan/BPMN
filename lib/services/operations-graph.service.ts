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
  parseApplicationSystemIdFromNodeId,
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

const toTaskNodeId = (id: number | string): number => Number(id);

const TASK_NODE_PREFIX = "TASK:";
const L3_NODE_PREFIX = "L3:";
const TABLE_EDGE_KINDS = new Set<GraphEdgeKind>(["READS_TABLE", "WRITES_TABLE"]);

const isTaskGraphNodeId = (nodeId: string): boolean =>
  nodeId.startsWith(TASK_NODE_PREFIX);

const isProcessGraphNodeId = (nodeId: string): boolean =>
  nodeId.startsWith(TASK_NODE_PREFIX) || nodeId.startsWith(L3_NODE_PREFIX);

type ProcessAdjacency = {
  successors: Map<string, string[]>;
  predecessors: Map<string, string[]>;
};

const buildProcessAdjacency = (
  edges: OperationsGraphEdge[],
): ProcessAdjacency => {
  const successors = new Map<string, string[]>();
  const predecessors = new Map<string, string[]>();

  const link = (source: string, target: string) => {
    const succList = successors.get(source) ?? [];
    if (!succList.includes(target)) {
      succList.push(target);
      successors.set(source, succList);
    }
    const predList = predecessors.get(target) ?? [];
    if (!predList.includes(source)) {
      predList.push(source);
      predecessors.set(target, predList);
    }
  };

  for (const edge of edges) {
    if (edge.kind !== "PRECEDES") {
      continue;
    }
    if (
      !isProcessGraphNodeId(edge.source) ||
      !isProcessGraphNodeId(edge.target)
    ) {
      continue;
    }
    link(edge.source, edge.target);
  }

  return { successors, predecessors };
};

const getDirectTaskApps = (
  edges: OperationsGraphEdge[],
  taskId: string,
): string[] =>
  edges
    .filter((edge) => edge.source === taskId && edge.kind === "USES_SCREEN")
    .map((edge) => edge.target);

/** 프로세스 흐름(TASK·L3)을 따라 인접 Task의 APPLICATION을 탐색한다 */
const findNearestTaskApps = (
  nodeId: string,
  direction: "backward" | "forward",
  edges: OperationsGraphEdge[],
  adjacency: ProcessAdjacency,
  visited = new Set<string>(),
): string[] => {
  if (visited.has(nodeId)) {
    return [];
  }
  visited.add(nodeId);

  if (isTaskGraphNodeId(nodeId)) {
    const directApps = getDirectTaskApps(edges, nodeId);
    if (directApps.length > 0) {
      return directApps;
    }
  }

  const neighbors =
    direction === "backward"
      ? (adjacency.predecessors.get(nodeId) ?? [])
      : (adjacency.successors.get(nodeId) ?? []);

  for (const neighbor of neighbors) {
    const found = findNearestTaskApps(
      neighbor,
      direction,
      edges,
      adjacency,
      visited,
    );
    if (found.length > 0) {
      return found;
    }
  }

  return [];
};

const linkApplicationPrecedesAcrossProcessFlow = (
  predApps: string[],
  succApps: string[],
  addPrecedes: (source: string, target: string) => void,
): void => {
  if (predApps.length === 0 || succApps.length === 0) {
    return;
  }

  for (const succApp of succApps) {
    const succSystemId = parseApplicationSystemIdFromNodeId(succApp);
    const predApp =
      succSystemId === null
        ? undefined
        : predApps.find(
            (appId) =>
              parseApplicationSystemIdFromNodeId(appId) === succSystemId,
          );
    const sourceApp = predApp ?? predApps[predApps.length - 1];
    if (sourceApp) {
      addPrecedes(sourceApp, succApp);
    }
  }
};

const getTablesViaApps = (
  appIds: string[],
  edges: OperationsGraphEdge[],
): string[] => {
  const tables: string[] = [];
  for (const appId of appIds) {
    for (const edge of edges) {
      if (edge.source === appId && TABLE_EDGE_KINDS.has(edge.kind)) {
        tables.push(edge.target);
      }
    }
  }
  return tables;
};

/** 프로세스 PRECEDES(TASK·L3) 흐름에 맞춰 APPLICATION·TABLE 간 PRECEDES 엣지를 추가한다 */
const linkResourcePrecedesFromTaskFlow = (
  edges: OperationsGraphEdge[],
): OperationsGraphEdge[] => {
  const result = [...edges];
  const edgeIds = new Set(result.map((edge) => edge.id));

  const addPrecedes = (source: string, target: string) => {
    const id = `PRECEDES:${source}->${target}`;
    if (edgeIds.has(id)) {
      return;
    }
    edgeIds.add(id);
    result.push({ id, source, target, kind: "PRECEDES" });
  };

  const processAdjacency = buildProcessAdjacency(edges);

  const processPrecedes = edges.filter(
    (edge) =>
      edge.kind === "PRECEDES" &&
      isProcessGraphNodeId(edge.source) &&
      isProcessGraphNodeId(edge.target),
  );

  for (const procEdge of processPrecedes) {
    const predApps = findNearestTaskApps(
      procEdge.source,
      "backward",
      edges,
      processAdjacency,
    );
    const succApps = findNearestTaskApps(
      procEdge.target,
      "forward",
      edges,
      processAdjacency,
    );

    linkApplicationPrecedesAcrossProcessFlow(predApps, succApps, addPrecedes);

    const predTables = getTablesViaApps(predApps, edges);
    const succTables = getTablesViaApps(succApps, edges);

    if (predTables.length > 0 && succTables.length > 0) {
      addPrecedes(predTables[predTables.length - 1]!, succTables[0]!);
    }
  }

  return result;
};

const filterToScopedTasks = (
  nodes: OperationsGraphNode[],
  edges: OperationsGraphEdge[],
  scopedTaskIds: ReadonlySet<number>,
): { nodes: OperationsGraphNode[]; edges: OperationsGraphEdge[] } => {
  const allowedNodeIds = new Set(
    nodes
      .filter(
        (node) =>
          node.kind !== "TASK" ||
          scopedTaskIds.has(toTaskNodeId(node.sourceId)),
      )
      .map((node) => node.id),
  );

  return {
    nodes: nodes.filter((node) => allowedNodeIds.has(node.id)),
    edges: edges.filter(
      (edge) =>
        allowedNodeIds.has(edge.source) && allowedNodeIds.has(edge.target),
    ),
  };
};

const RESOURCE_NODE_KINDS = new Set<GraphNodeKind>([
  "APPLICATION",
  "TABLE",
  "INTERFACE",
]);

/** E2E 탐색 범위 — BPMN L3 Call Activity 및 그 하위 L4·리소스만 유지 */
const filterToE2eScope = (
  nodes: OperationsGraphNode[],
  edges: OperationsGraphEdge[],
  scopedL3Ids: ReadonlySet<number>,
  scopedTaskIds: ReadonlySet<number>,
): { nodes: OperationsGraphNode[]; edges: OperationsGraphEdge[] } => {
  const allowedNodeIds = new Set<string>();

  for (const node of nodes) {
    if (node.kind === "L3" && scopedL3Ids.has(Number(node.sourceId))) {
      allowedNodeIds.add(node.id);
    }
    if (node.kind === "TASK" && scopedTaskIds.has(toTaskNodeId(node.sourceId))) {
      allowedNodeIds.add(node.id);
    }
  }

  let changed = true;
  while (changed) {
    changed = false;
    for (const edge of edges) {
      if (!allowedNodeIds.has(edge.source) || allowedNodeIds.has(edge.target)) {
        continue;
      }
      const targetNode = nodes.find((item) => item.id === edge.target);
      if (targetNode && RESOURCE_NODE_KINDS.has(targetNode.kind)) {
        allowedNodeIds.add(edge.target);
        changed = true;
      }
    }
  }

  return {
    nodes: nodes.filter((node) => allowedNodeIds.has(node.id)),
    edges: edges.filter(
      (edge) =>
        allowedNodeIds.has(edge.source) && allowedNodeIds.has(edge.target),
    ),
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

  const isL3ProcessCenter =
    centerKind === "L3" &&
    (centerProcessLevel === "L3" || centerProcessLevel === undefined);

  const isE2eCenter = centerKind === "E2E";

  let scopedL3TaskIds: ReadonlySet<number> | undefined;
  if (isL3ProcessCenter) {
    const l3NodeId = Number(centerId);
    if (Number.isFinite(l3NodeId)) {
      const childTasks = await graphQueries.listChildTasks(l3NodeId);
      scopedL3TaskIds = new Set(
        childTasks.map((task) => toTaskNodeId(task.nodeId)),
      );
    }
  }

  let scopedE2eL3Ids: ReadonlySet<number> | undefined;
  let scopedE2eTaskIds: ReadonlySet<number> | undefined;
  if (isE2eCenter) {
    const e2eProcessId = Number(centerId);
    if (Number.isFinite(e2eProcessId)) {
      const linkedL3Ids = await e2eQueries.listE2eParticipantL3Ids(e2eProcessId);
      scopedE2eL3Ids = new Set(linkedL3Ids.map((nodeId) => Number(nodeId)));
      scopedE2eTaskIds = await graphQueries.listChildTaskIdsForL3s(scopedE2eL3Ids);
    }
  }

  const neighborOptions = {
    showInterfaces,
    showTables,
    allowedTaskIds:
      scopedL3TaskIds ??
      (isE2eCenter && scopedE2eL3Ids && scopedE2eL3Ids.size > 0
        ? scopedE2eTaskIds
        : undefined),
    allowedL3Ids:
      isE2eCenter && scopedE2eL3Ids && scopedE2eL3Ids.size > 0
        ? scopedE2eL3Ids
        : undefined,
  };

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
        allowedTaskIds: neighborOptions.allowedTaskIds,
        allowedL3Ids: neighborOptions.allowedL3Ids,
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
          neighborOptions,
        );
      }
    } else if (current.kind === "APPLICATION") {
      const systemId = Number(current.sourceId);
      if (!Number.isFinite(systemId)) {
        throw new ApiError("E001", "Invalid system id", 400);
      }
      bundle = await graphQueries.collectApplicationNeighbors(systemId, {
        showInterfaces,
        // BFS 이웃 확장 시 시스템 전체 테이블을 끌어오지 않음 (Task별 연결만 유지)
        includeTables: showTables && current.depth === 0,
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

        // L3 중심: 하위 Task만 1-hop 확장(리소스). APP·타 L3·타 Task BFS 제외
        if (isL3ProcessCenter && scopedL3TaskIds) {
          if (node.kind !== "TASK") {
            continue;
          }
          if (!scopedL3TaskIds.has(toTaskNodeId(node.sourceId))) {
            continue;
          }
        }

        // E2E 중심: BPMN L3·하위 L4만 확장. APP BFS 시 동일 시스템 전체 Task 유입 방지
        if (
          isE2eCenter &&
          scopedE2eL3Ids &&
          scopedE2eL3Ids.size > 0 &&
          scopedE2eTaskIds
        ) {
          if (RESOURCE_NODE_KINDS.has(node.kind)) {
            continue;
          }
          if (
            node.kind === "L3" &&
            !scopedE2eL3Ids.has(Number(node.sourceId))
          ) {
            continue;
          }
          if (
            node.kind === "TASK" &&
            !scopedE2eTaskIds.has(toTaskNodeId(node.sourceId))
          ) {
            continue;
          }
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
  let edges = linkResourcePrecedesFromTaskFlow(Array.from(edgeMap.values()));

  if (scopedL3TaskIds) {
    ({ nodes, edges } = filterToScopedTasks(nodes, edges, scopedL3TaskIds));
  }

  if (scopedE2eL3Ids && scopedE2eTaskIds && scopedE2eL3Ids.size > 0) {
    ({ nodes, edges } = filterToE2eScope(
      nodes,
      edges,
      scopedE2eL3Ids,
      scopedE2eTaskIds,
    ));
  }

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
