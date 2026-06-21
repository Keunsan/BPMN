import dagre from "@dagrejs/dagre";
import type { Edge, Node } from "@xyflow/react";

import type { GraphEdgeData } from "@/components/analysis/operations-graph/canvas/GraphEdgeLine";
import type { GraphNodeData } from "@/components/analysis/operations-graph/canvas/GraphNodeCard";
import {
  GRAPH_NODE_DIMENSIONS,
  estimateProcessNodeWidth,
} from "@/components/analysis/operations-graph/canvas/graph-style-tokens";
import type { GraphNodeKind, GraphViewMode } from "@/types/operations-graph";

/** Task 프로세스 카드 크기 — dagre 배치 기준 */
export const GRAPH_NODE_WIDTH = GRAPH_NODE_DIMENSIONS.processWidth;
export const GRAPH_NODE_HEIGHT = GRAPH_NODE_DIMENSIONS.processHeight;
/** 리소스(APP/TABLE/IF) 컴팩트 칩 크기 */
export const GRAPH_RESOURCE_WIDTH = GRAPH_NODE_DIMENSIONS.resourceWidth;
export const GRAPH_RESOURCE_HEIGHT = GRAPH_NODE_DIMENSIONS.resourceHeight;
/** 앱 하위 테이블 리스트 행 높이 */
export const GRAPH_TABLE_LIST_ITEM_HEIGHT =
  GRAPH_NODE_DIMENSIONS.tableListItemHeight;
/** L3 앵커 — 종속 엣지 연결용, 카드는 렌더하지 않음 */
export const GRAPH_NODE_ANCHOR_SIZE = GRAPH_NODE_DIMENSIONS.anchorSize;

const PROCESS_EDGE_KINDS = new Set(["CONTAINS", "PRECEDES"]);
const CHAIN_EDGE_KINDS = new Set([
  "USES_SCREEN",
  "READS_TABLE",
  "WRITES_TABLE",
  "INTERFACE",
]);

/** 계층뷰 — Task 가로 열 간격 */
const HIER_TASK_NODESEP = 36;
const HIER_TASK_RANKSEP = 128;
const HIER_TASK_LANE_Y = 80;
/** E2E 계층뷰 — L3 업무 순서 열 */
const HIER_L3_LANE_Y = 48;
const HIER_L3_TO_TASK_GAP = 56;
const HIER_L3_COLUMN_GAP = 72;
const HIER_TASK_STACK_GAP = 36;
/** 계층뷰 — Task 아래 리소스 밴드 */
const HIER_TASK_TO_RESOURCE_GAP = 80;
const HIER_APP_VERTICAL_GAP = 24;
const HIER_APP_TO_TABLE_GAP = 22;
const HIER_TABLE_ITEM_GAP = 4;
const HIER_TABLE_TO_IF_GAP = 16;
const HIER_IF_ITEM_GAP = 10;
const HIER_RESOURCE_BOTTOM_PAD = 36;
/** 노드 겹침 방지 최소 간격 */
const OVERLAP_PADDING = 20;

/** 방사뷰 — Task 세로 간격 */
const RAD_TASK_NODESEP = 56;
const RAD_TASK_RANKSEP = 96;
const RAD_TASK_TO_APP_GAP = 96;
const RAD_APP_TO_TABLE_GAP = 72;
const RAD_APP_ROW_GAP = 20;
const RAD_TABLE_ITEM_GAP = 4;
const RAD_TABLE_TO_IF_GAP = 24;
const RAD_IF_ITEM_GAP = 10;

type Position = { x: number; y: number };
type Dimensions = { width: number; height: number };
type TableListMeta = { index: number; total: number };

type TaskResourceLayoutResult = {
  positions: Map<string, Position>;
  tableListMeta: Map<string, TableListMeta>;
  /** dagre 열/행 크기 산정용 — Task 카드 바깥 확장 */
  columnWidth: number;
  rowHeight: number;
};

const isProcessKind = (kind: GraphNodeKind | undefined): boolean =>
  kind === "E2E" || kind === "L3" || kind === "TASK";

const isResourceKind = (kind: GraphNodeKind | undefined): boolean =>
  kind === "APPLICATION" || kind === "TABLE" || kind === "INTERFACE";

/** 노드 종류별 렌더·배치 크기 */
export const getGraphNodeDimensions = (
  kind: GraphNodeKind | undefined,
  nodeData?: Pick<GraphNodeData, "label" | "code">,
): Dimensions => {
  if (kind === "TABLE") {
    return {
      width: GRAPH_RESOURCE_WIDTH,
      height: GRAPH_TABLE_LIST_ITEM_HEIGHT,
    };
  }
  if (isResourceKind(kind)) {
    return {
      width: GRAPH_RESOURCE_WIDTH,
      height: GRAPH_RESOURCE_HEIGHT,
    };
  }
  const width = nodeData?.label
    ? estimateProcessNodeWidth(nodeData.label, nodeData.code)
    : GRAPH_NODE_WIDTH;
  return { width, height: GRAPH_NODE_HEIGHT };
};

const getNodeKind = (node: Node): GraphNodeKind | undefined =>
  (node.data as GraphNodeData | undefined)?.kind;

const getNodeData = (node: Node): GraphNodeData | undefined =>
  node.data as GraphNodeData | undefined;

const getNodeKindById = (
  nodes: Node[],
  nodeId: string,
): GraphNodeKind | undefined => {
  const node = nodes.find((item) => item.id === nodeId);
  return node ? getNodeKind(node) : undefined;
};

const buildChainChildrenMap = (
  nodes: Node[],
  edges: Edge[],
): Map<string, string[]> => {
  const children = new Map<string, string[]>();

  const addChild = (parentId: string, childId: string) => {
    const list = children.get(parentId) ?? [];
    if (!list.includes(childId)) {
      list.push(childId);
      children.set(parentId, list);
    }
  };

  for (const edge of edges) {
    const kind = (edge.data as GraphEdgeData | undefined)?.kind;
    if (!kind || !CHAIN_EDGE_KINDS.has(kind)) {
      continue;
    }
    addChild(edge.source, edge.target);
  }

  for (const [, childIds] of children) {
    childIds.sort();
  }

  return children;
};

const buildContainsChildrenMap = (edges: Edge[]): Map<string, string[]> => {
  const children = new Map<string, string[]>();

  for (const edge of edges) {
    const kind = (edge.data as GraphEdgeData | undefined)?.kind;
    if (kind !== "CONTAINS") {
      continue;
    }
    const list = children.get(edge.source) ?? [];
    if (!list.includes(edge.target)) {
      list.push(edge.target);
      children.set(edge.source, list);
    }
  }

  for (const [, childIds] of children) {
    childIds.sort();
  }

  return children;
};

type BoundingBox = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

const getNodeBoundingBox = (
  nodeId: string,
  positions: Map<string, Position>,
  dimensions: Map<string, Dimensions>,
): BoundingBox | null => {
  const position = positions.get(nodeId);
  const dimension = dimensions.get(nodeId);
  if (!position || !dimension) {
    return null;
  }
  return {
    id: nodeId,
    x: position.x,
    y: position.y,
    width: dimension.width,
    height: dimension.height,
  };
};

const boxesOverlap = (
  a: BoundingBox,
  b: BoundingBox,
  padding: number,
): boolean =>
  a.x < b.x + b.width + padding &&
  a.x + a.width + padding > b.x &&
  a.y < b.y + b.height + padding &&
  a.y + a.height + padding > b.y;

/** 배치된 노드 간 겹침을 해소한다 */
const resolveNodeCollisions = (
  nodeIds: string[],
  positions: Map<string, Position>,
  dimensions: Map<string, Dimensions>,
  padding = OVERLAP_PADDING,
  maxIterations = 64,
): void => {
  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    let moved = false;

    for (let i = 0; i < nodeIds.length; i += 1) {
      for (let j = i + 1; j < nodeIds.length; j += 1) {
        const boxA = getNodeBoundingBox(nodeIds[i]!, positions, dimensions);
        const boxB = getNodeBoundingBox(nodeIds[j]!, positions, dimensions);
        if (!boxA || !boxB || !boxesOverlap(boxA, boxB, padding)) {
          continue;
        }

        const posB = positions.get(boxB.id)!;
        const pushDown = boxA.y + boxA.height + padding - boxB.y;
        const pushRight = boxA.x + boxA.width + padding - boxB.x;

        if (pushDown > 0 && (pushRight <= 0 || pushDown <= pushRight)) {
          positions.set(boxB.id, { x: posB.x, y: posB.y + pushDown });
          moved = true;
          continue;
        }

        if (pushRight > 0) {
          positions.set(boxB.id, { x: posB.x + pushRight, y: posB.y });
          moved = true;
        }
      }
    }

    if (!moved) {
      break;
    }
  }
};

const topologicalSortByPrecedes = (
  nodeIds: string[],
  edges: Edge[],
): string[] => {
  if (nodeIds.length <= 1) {
    return [...nodeIds];
  }

  const idSet = new Set(nodeIds);
  const incoming = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  for (const id of nodeIds) {
    incoming.set(id, 0);
    adjacency.set(id, []);
  }

  for (const edge of edges) {
    const kind = (edge.data as GraphEdgeData | undefined)?.kind;
    if (kind !== "PRECEDES") {
      continue;
    }
    if (!idSet.has(edge.source) || !idSet.has(edge.target)) {
      continue;
    }
    adjacency.get(edge.source)!.push(edge.target);
    incoming.set(edge.target, (incoming.get(edge.target) ?? 0) + 1);
  }

  const queue = nodeIds.filter((id) => (incoming.get(id) ?? 0) === 0);
  const sorted: string[] = [];

  while (queue.length > 0) {
    const current = queue.shift()!;
    sorted.push(current);
    for (const next of adjacency.get(current) ?? []) {
      const count = (incoming.get(next) ?? 1) - 1;
      incoming.set(next, count);
      if (count === 0) {
        queue.push(next);
      }
    }
  }

  for (const id of nodeIds) {
    if (!sorted.includes(id)) {
      sorted.push(id);
    }
  }

  return sorted;
};

/** Task 선후행·Call Activity 흐름에서 L3 열 간 순서를 도출한다 */
const topologicalSortL3Columns = (
  l3NodeIds: string[],
  edges: Edge[],
  nodes: Node[],
  containsMap: Map<string, string[]>,
): string[] => {
  if (l3NodeIds.length <= 1) {
    return [...l3NodeIds];
  }

  const l3IdSet = new Set(l3NodeIds);
  const taskParentL3 = new Map<string, string>();

  for (const [parentId, children] of containsMap) {
    if (getNodeKindById(nodes, parentId) !== "L3") {
      continue;
    }
    for (const childId of children) {
      if (getNodeKindById(nodes, childId) === "TASK") {
        taskParentL3.set(childId, parentId);
      }
    }
  }

  const resolveToL3 = (nodeId: string): string | null => {
    const kind = getNodeKindById(nodes, nodeId);
    if (kind === "L3" && l3IdSet.has(nodeId)) {
      return nodeId;
    }
    if (kind === "TASK") {
      const parentL3 = taskParentL3.get(nodeId);
      return parentL3 && l3IdSet.has(parentL3) ? parentL3 : null;
    }
    return null;
  };

  const l3PrecedesKeys = new Set<string>();
  const l3PrecedesEdges: Edge[] = [];

  for (const edge of edges) {
    const kind = (edge.data as GraphEdgeData | undefined)?.kind;
    if (kind !== "PRECEDES") {
      continue;
    }

    const sourceL3 = resolveToL3(edge.source);
    const targetL3 = resolveToL3(edge.target);
    if (!sourceL3 || !targetL3 || sourceL3 === targetL3) {
      continue;
    }

    const key = `${sourceL3}->${targetL3}`;
    if (l3PrecedesKeys.has(key)) {
      continue;
    }
    l3PrecedesKeys.add(key);
    l3PrecedesEdges.push({
      id: `l3-column:${key}`,
      source: sourceL3,
      target: targetL3,
      data: { kind: "PRECEDES" },
    });
  }

  return topologicalSortByPrecedes(l3NodeIds, l3PrecedesEdges);
};

const shouldInlineCallActivityL3 = (
  l3Id: string,
  edges: Edge[],
  nodes: Node[],
): boolean =>
  edges.some((edge) => {
    const kind = (edge.data as GraphEdgeData | undefined)?.kind;
    return (
      kind === "PRECEDES" &&
      edge.target === l3Id &&
      getNodeKindById(nodes, edge.source) === "TASK"
    );
  });

const findPrecedingTaskForL3 = (
  l3Id: string,
  edges: Edge[],
  nodes: Node[],
): string | null => {
  for (const edge of edges) {
    const kind = (edge.data as GraphEdgeData | undefined)?.kind;
    if (kind !== "PRECEDES" || edge.target !== l3Id) {
      continue;
    }
    if (getNodeKindById(nodes, edge.source) === "TASK") {
      return edge.source;
    }
  }
  return null;
};

/** L3 열 — L3 카드·하위 Task·리소스 세로 스택 */
const layoutL3ProcessColumn = (
  l3Id: string,
  columnX: number,
  l3LaneY: number,
  nodes: Node[],
  edges: Edge[],
  containsMap: Map<string, string[]>,
  chainChildrenMap: Map<string, string[]>,
  dimensions: Map<string, Dimensions>,
  positions: Map<string, Position>,
  tableListMeta: Map<string, TableListMeta>,
  assignedTaskIds: Set<string>,
): number => {
  const l3Node = nodes.find((node) => node.id === l3Id);
  if (!l3Node) {
    return 0;
  }

  const l3Dim =
    dimensions.get(l3Id) ??
    getGraphNodeDimensions("L3", getNodeData(l3Node));

  const taskIds = topologicalSortByPrecedes(
    (containsMap.get(l3Id) ?? []).filter(
      (childId) => getNodeKindById(nodes, childId) === "TASK",
    ),
    edges,
  );

  const taskMetrics = taskIds.map((taskId) => {
    const taskNode = nodes.find((node) => node.id === taskId);
    const taskDim =
      dimensions.get(taskId) ??
      getGraphNodeDimensions("TASK", taskNode ? getNodeData(taskNode) : undefined);
    const metrics = layoutTaskResourcesHierarchical(
      taskId,
      { x: 0, y: 0 },
      taskDim,
      nodes,
      chainChildrenMap,
      dimensions,
    );
    return { taskId, taskDim, metrics };
  });

  let columnWidth = l3Dim.width;
  for (const { metrics } of taskMetrics) {
    columnWidth = Math.max(columnWidth, metrics.columnWidth);
  }

  const l3X = columnX + (columnWidth - l3Dim.width) / 2;
  positions.set(l3Id, { x: l3X, y: l3LaneY });

  let cursorY = l3LaneY + l3Dim.height + HIER_L3_TO_TASK_GAP;

  for (const [index, { taskId, metrics }] of taskMetrics.entries()) {
    assignedTaskIds.add(taskId);
    const taskX = columnX + (columnWidth - metrics.columnWidth) / 2;
    const taskOrigin = { x: taskX, y: cursorY };

    positions.set(taskId, taskOrigin);
    mergeResourceLayout(positions, tableListMeta, metrics, taskOrigin);

    cursorY += metrics.rowHeight;
    if (index < taskMetrics.length - 1) {
      cursorY += HIER_TASK_STACK_GAP;
    }
  }

  return columnWidth;
};

const mergeResourceLayout = (
  targetPositions: Map<string, Position>,
  targetTableMeta: Map<string, TableListMeta>,
  result: TaskResourceLayoutResult,
  offset: Position,
): void => {
  for (const [resourceId, position] of result.positions) {
    targetPositions.set(resourceId, {
      x: position.x + offset.x,
      y: position.y + offset.y,
    });
  }
  for (const [tableId, meta] of result.tableListMeta) {
    targetTableMeta.set(tableId, meta);
  }
};

/** E2E 계층뷰 — L3 업무 순서 열 + Task·리소스 세로 스택 (겹침 없음) */
const layoutE2eHierarchicalGraph = (
  nodes: Node[],
  edges: Edge[],
  dimensions: Map<string, Dimensions>,
): { positions: Map<string, Position>; tableListMeta: Map<string, TableListMeta> } => {
  const positions = new Map<string, Position>();
  const tableListMeta = new Map<string, TableListMeta>();
  const chainChildrenMap = buildChainChildrenMap(nodes, edges);
  const containsMap = buildContainsChildrenMap(edges);

  const l3Nodes = nodes.filter((node) => getNodeKind(node) === "L3");
  const callActivityL3Ids = new Set(
    l3Nodes
      .filter((node) => shouldInlineCallActivityL3(node.id, edges, nodes))
      .map((node) => node.id),
  );
  const l3Order = topologicalSortL3Columns(
    l3Nodes.map((node) => node.id),
    edges,
    nodes,
    containsMap,
  ).filter((l3Id) => !callActivityL3Ids.has(l3Id));

  const assignedTaskIds = new Set<string>();
  let columnX = 48;

  for (const l3Id of l3Order) {
    const columnWidth = layoutL3ProcessColumn(
      l3Id,
      columnX,
      HIER_L3_LANE_Y,
      nodes,
      edges,
      containsMap,
      chainChildrenMap,
      dimensions,
      positions,
      tableListMeta,
      assignedTaskIds,
    );
    columnX += columnWidth + HIER_L3_COLUMN_GAP;
  }

  const inlineCallL3Order = topologicalSortByPrecedes(
    [...callActivityL3Ids],
    edges,
  ).sort((leftId, rightId) => {
    const leftTaskId = findPrecedingTaskForL3(leftId, edges, nodes);
    const rightTaskId = findPrecedingTaskForL3(rightId, edges, nodes);
    const leftPos = leftTaskId ? positions.get(leftTaskId) : undefined;
    const rightPos = rightTaskId ? positions.get(rightTaskId) : undefined;

    if (!leftPos || !rightPos) {
      return 0;
    }
    if (leftPos.x !== rightPos.x) {
      return leftPos.x - rightPos.x;
    }
    return leftPos.y - rightPos.y;
  });

  for (const l3Id of inlineCallL3Order) {
    const precedingTaskId = findPrecedingTaskForL3(l3Id, edges, nodes);
    const precedingPos = precedingTaskId
      ? positions.get(precedingTaskId)
      : undefined;
    const precedingDim = precedingTaskId
      ? dimensions.get(precedingTaskId)
      : undefined;

    if (!precedingPos || !precedingDim) {
      continue;
    }

    const inlineX = precedingPos.x + precedingDim.width + HIER_L3_COLUMN_GAP;
    layoutL3ProcessColumn(
      l3Id,
      inlineX,
      precedingPos.y,
      nodes,
      edges,
      containsMap,
      chainChildrenMap,
      dimensions,
      positions,
      tableListMeta,
      assignedTaskIds,
    );
  }

  const orphanTaskNodes = nodes.filter(
    (node) => getNodeKind(node) === "TASK" && !assignedTaskIds.has(node.id),
  );

  if (orphanTaskNodes.length > 0) {
    let orphanX = columnX;
    const orphanOrder = topologicalSortByPrecedes(
      orphanTaskNodes.map((node) => node.id),
      edges,
    );

    for (const taskId of orphanOrder) {
      const taskNode = nodes.find((node) => node.id === taskId);
      if (!taskNode) {
        continue;
      }

      const taskDim =
        dimensions.get(taskId) ??
        getGraphNodeDimensions("TASK", getNodeData(taskNode));
      const metrics = layoutTaskResourcesHierarchical(
        taskId,
        { x: 0, y: 0 },
        taskDim,
        nodes,
        chainChildrenMap,
        dimensions,
      );

      const taskOrigin = { x: orphanX, y: HIER_TASK_LANE_Y };
      positions.set(taskId, taskOrigin);
      mergeResourceLayout(positions, tableListMeta, metrics, taskOrigin);

      orphanX += metrics.columnWidth + HIER_L3_COLUMN_GAP;
    }
  }

  const orphanResources = nodes.filter(
    (node) =>
      isResourceKind(getNodeKind(node)) && !positions.has(node.id),
  );

  let orphanResourceY =
    HIER_L3_LANE_Y +
    GRAPH_NODE_HEIGHT +
    HIER_L3_TO_TASK_GAP +
    GRAPH_NODE_HEIGHT +
    HIER_TASK_TO_RESOURCE_GAP +
    120;

  for (const [index, resourceNode] of orphanResources.entries()) {
    const kind = getNodeKind(resourceNode);
    const { width, height } = getGraphNodeDimensions(kind, getNodeData(resourceNode));
    positions.set(resourceNode.id, {
      x: 48 + index * (width + HIER_L3_COLUMN_GAP),
      y: orphanResourceY,
    });
  }

  const positionedIds = [...positions.keys()];
  if (orphanResources.length > 0 || callActivityL3Ids.size > 0) {
    resolveNodeCollisions(positionedIds, positions, dimensions);
  }

  return { positions, tableListMeta };
};

const shouldUseE2eColumnLayout = (
  nodes: Node[],
  viewMode: GraphViewMode,
): boolean => {
  if (viewMode !== "hierarchical") {
    return false;
  }
  return nodes.some((node) => getNodeKind(node) === "L3");
};

const resolveTableIdsForApp = (
  appId: string,
  childrenMap: Map<string, string[]>,
  nodes: Node[],
): string[] =>
  (childrenMap.get(appId) ?? []).filter(
    (childId) => getNodeKindById(nodes, childId) === "TABLE",
  );

const placeInterfacesHorizontal = (
  startX: number,
  anchorY: number,
  parentIds: string[],
  childrenMap: Map<string, string[]>,
  nodes: Node[],
  dimensions: Map<string, Dimensions>,
  positions: Map<string, Position>,
): number => {
  let cursorX = startX;

  for (const parentId of parentIds) {
    const interfaceIds = (childrenMap.get(parentId) ?? []).filter(
      (childId) => getNodeKindById(nodes, childId) === "INTERFACE",
    );

    for (const interfaceId of interfaceIds) {
      if (positions.has(interfaceId)) {
        continue;
      }
      const ifDim = dimensions.get(interfaceId) ?? {
        width: GRAPH_RESOURCE_WIDTH,
        height: GRAPH_RESOURCE_HEIGHT,
      };
      positions.set(interfaceId, { x: cursorX, y: anchorY });
      cursorX += ifDim.width + RAD_IF_ITEM_GAP;
    }
  }

  return cursorX;
};

const placeInterfacesVertical = (
  anchorX: number,
  startY: number,
  parentIds: string[],
  childrenMap: Map<string, string[]>,
  nodes: Node[],
  dimensions: Map<string, Dimensions>,
  positions: Map<string, Position>,
): number => {
  let nextY = startY;

  for (const parentId of parentIds) {
    const interfaceIds = (childrenMap.get(parentId) ?? []).filter(
      (childId) => getNodeKindById(nodes, childId) === "INTERFACE",
    );

    for (const interfaceId of interfaceIds) {
      if (positions.has(interfaceId)) {
        continue;
      }
      const ifDim = dimensions.get(interfaceId) ?? {
        width: GRAPH_RESOURCE_WIDTH,
        height: GRAPH_RESOURCE_HEIGHT,
      };
      positions.set(interfaceId, { x: anchorX, y: nextY });
      nextY += ifDim.height + HIER_IF_ITEM_GAP;
    }
  }

  return nextY;
};

/** 계층뷰 — Task 아래 App·Table 세로 스택 */
const layoutTaskResourcesHierarchical = (
  taskNodeId: string,
  taskOrigin: Position,
  taskDim: Dimensions,
  nodes: Node[],
  childrenMap: Map<string, string[]>,
  dimensions: Map<string, Dimensions>,
): TaskResourceLayoutResult => {
  const positions = new Map<string, Position>();
  const tableListMeta = new Map<string, TableListMeta>();
  const taskCenterX = taskOrigin.x + taskDim.width / 2;

  const appIds = (childrenMap.get(taskNodeId) ?? []).filter(
    (childId) => getNodeKindById(nodes, childId) === "APPLICATION",
  );

  const tableDim = {
    width: GRAPH_RESOURCE_WIDTH,
    height: GRAPH_TABLE_LIST_ITEM_HEIGHT,
  };

  if (appIds.length === 0) {
    return {
      positions,
      tableListMeta,
      columnWidth: taskDim.width,
      rowHeight: taskDim.height,
    };
  }

  let cursorY = taskOrigin.y + taskDim.height + HIER_TASK_TO_RESOURCE_GAP;
  let maxRight = taskOrigin.x + taskDim.width;
  let maxBottom = taskOrigin.y + taskDim.height;

  for (const [appIndex, appId] of appIds.entries()) {
    const appDim = dimensions.get(appId) ?? {
      width: GRAPH_RESOURCE_WIDTH,
      height: GRAPH_RESOURCE_HEIGHT,
    };
    const appX = taskCenterX - appDim.width / 2;

    positions.set(appId, { x: appX, y: cursorY });
    maxRight = Math.max(maxRight, appX + appDim.width);
    maxBottom = Math.max(maxBottom, cursorY + appDim.height);

    const tableIds = resolveTableIdsForApp(appId, childrenMap, nodes);

    const tableListTop = cursorY + appDim.height + HIER_APP_TO_TABLE_GAP;

    for (const [tableIndex, tableId] of tableIds.entries()) {
      positions.set(tableId, {
        x: appX,
        y: tableListTop + tableIndex * (tableDim.height + HIER_TABLE_ITEM_GAP),
      });
      tableListMeta.set(tableId, { index: tableIndex, total: tableIds.length });
    }

    const tableBlockHeight =
      tableIds.length > 0
        ? tableIds.length * tableDim.height +
          (tableIds.length - 1) * HIER_TABLE_ITEM_GAP
        : 0;

    const columnBottom = placeInterfacesVertical(
      appX,
      tableIds.length > 0
        ? tableListTop + tableBlockHeight + HIER_TABLE_TO_IF_GAP
        : cursorY + appDim.height + HIER_TABLE_TO_IF_GAP,
      [...tableIds, appId],
      childrenMap,
      nodes,
      dimensions,
      positions,
    );

    maxBottom = Math.max(maxBottom, columnBottom - HIER_IF_ITEM_GAP);
    maxRight = Math.max(maxRight, appX + tableDim.width);
    cursorY = columnBottom;
    if (appIndex < appIds.length - 1) {
      cursorY += HIER_APP_VERTICAL_GAP;
    }
  }

  const bandHeight =
    maxBottom - (taskOrigin.y + taskDim.height) + HIER_RESOURCE_BOTTOM_PAD;

  return {
    positions,
    tableListMeta,
    columnWidth: Math.max(taskDim.width, maxRight - taskOrigin.x),
    rowHeight: taskDim.height + Math.max(0, bandHeight),
  };
};

/** 방사뷰 — Task 오른쪽 App, App 오른쪽 Table */
const layoutTaskResourcesRadial = (
  taskNodeId: string,
  taskOrigin: Position,
  taskDim: Dimensions,
  nodes: Node[],
  childrenMap: Map<string, string[]>,
  dimensions: Map<string, Dimensions>,
): TaskResourceLayoutResult => {
  const positions = new Map<string, Position>();
  const tableListMeta = new Map<string, TableListMeta>();

  const appIds = (childrenMap.get(taskNodeId) ?? []).filter(
    (childId) => getNodeKindById(nodes, childId) === "APPLICATION",
  );

  const tableDim = {
    width: GRAPH_RESOURCE_WIDTH,
    height: GRAPH_TABLE_LIST_ITEM_HEIGHT,
  };

  if (appIds.length === 0) {
    return {
      positions,
      tableListMeta,
      columnWidth: taskDim.width,
      rowHeight: taskDim.height,
    };
  }

  const appX = taskOrigin.x + taskDim.width + RAD_TASK_TO_APP_GAP;
  let maxRight = taskOrigin.x + taskDim.width;
  let maxBottom = taskOrigin.y + taskDim.height;
  let appCursorY = taskOrigin.y;

  for (const appId of appIds) {
    const appDim = dimensions.get(appId) ?? {
      width: GRAPH_RESOURCE_WIDTH,
      height: GRAPH_RESOURCE_HEIGHT,
    };

    positions.set(appId, { x: appX, y: appCursorY });
    maxRight = Math.max(maxRight, appX + appDim.width);

    const tableIds = resolveTableIdsForApp(appId, childrenMap, nodes);

    const tableX = appX + appDim.width + RAD_APP_TO_TABLE_GAP;
    let rowBottom = appCursorY + appDim.height;

    for (const [tableIndex, tableId] of tableIds.entries()) {
      const tableY =
        appCursorY + tableIndex * (tableDim.height + RAD_TABLE_ITEM_GAP);
      positions.set(tableId, { x: tableX, y: tableY });
      tableListMeta.set(tableId, { index: tableIndex, total: tableIds.length });
      rowBottom = Math.max(
        rowBottom,
        tableY + tableDim.height,
      );
    }

    maxRight = Math.max(
      maxRight,
      placeInterfacesHorizontal(
        tableIds.length > 0
          ? tableX + tableDim.width + RAD_TABLE_TO_IF_GAP
          : appX + appDim.width + RAD_TABLE_TO_IF_GAP,
        appCursorY,
        [...tableIds, appId],
        childrenMap,
        nodes,
        dimensions,
        positions,
      ),
      tableIds.length > 0 ? tableX + tableDim.width : appX + appDim.width,
    );

    maxBottom = Math.max(maxBottom, rowBottom);
    appCursorY = rowBottom + RAD_APP_ROW_GAP;
  }

  return {
    positions,
    tableListMeta,
    columnWidth: maxRight - taskOrigin.x,
    rowHeight: Math.max(taskDim.height, maxBottom - taskOrigin.y),
  };
};

const layoutTaskResources = (
  viewMode: GraphViewMode,
  taskNodeId: string,
  taskOrigin: Position,
  taskDim: Dimensions,
  nodes: Node[],
  childrenMap: Map<string, string[]>,
  dimensions: Map<string, Dimensions>,
): TaskResourceLayoutResult =>
  viewMode === "hierarchical"
    ? layoutTaskResourcesHierarchical(
        taskNodeId,
        taskOrigin,
        taskDim,
        nodes,
        childrenMap,
        dimensions,
      )
    : layoutTaskResourcesRadial(
        taskNodeId,
        taskOrigin,
        taskDim,
        nodes,
        childrenMap,
        dimensions,
      );

/** 프로세스 노드 dagre 배치 — Task 카드 크기만 사용, 리소스는 별도 배치 */
const layoutProcessNodes = (
  nodes: Node[],
  edges: Edge[],
  viewMode: GraphViewMode,
  dimensions: Map<string, Dimensions>,
): Map<string, Position> => {
  const isHierarchical = viewMode === "hierarchical";
  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({
    rankdir: isHierarchical ? "LR" : "TB",
    nodesep: isHierarchical ? HIER_TASK_NODESEP : RAD_TASK_NODESEP,
    ranksep: isHierarchical ? HIER_TASK_RANKSEP : RAD_TASK_RANKSEP,
    marginx: 48,
    marginy: 48,
  });

  const processNodes = nodes.filter((node) =>
    isProcessKind(getNodeKind(node)),
  );
  const processNodeIds = new Set(processNodes.map((node) => node.id));
  const childrenMap = buildChainChildrenMap(nodes, edges);
  const layoutDimensions = new Map<string, Dimensions>();

  for (const node of processNodes) {
    const kind = getNodeKind(node);
    const displayDim = getGraphNodeDimensions(kind, getNodeData(node));

    if (kind === "TASK") {
      const metrics = layoutTaskResources(
        viewMode,
        node.id,
        { x: 0, y: 0 },
        displayDim,
        nodes,
        childrenMap,
        dimensions,
      );
      layoutDimensions.set(node.id, {
        width: metrics.columnWidth,
        height: metrics.rowHeight,
      });
      continue;
    }

    layoutDimensions.set(node.id, displayDim);
  }

  for (const node of processNodes) {
    const layoutDim = layoutDimensions.get(node.id);
    if (layoutDim) {
      graph.setNode(node.id, layoutDim);
    }
  }

  for (const edge of edges) {
    const kind = (edge.data as GraphEdgeData | undefined)?.kind;
    if (!kind || !PROCESS_EDGE_KINDS.has(kind)) {
      continue;
    }
    if (
      !processNodeIds.has(edge.source) ||
      !processNodeIds.has(edge.target)
    ) {
      continue;
    }
    graph.setEdge(edge.source, edge.target, {
      weight: kind === "PRECEDES" ? 3 : 1,
      minlen: 1,
    });
  }

  if (processNodes.length > 0 && graph.nodeCount() > 0) {
    dagre.layout(graph);
  }

  const positions = new Map<string, Position>();

  for (const node of processNodes) {
    const kind = getNodeKind(node);
    const nodeData = getNodeData(node);
    const displayDim = getGraphNodeDimensions(kind, nodeData);
    const layoutDim = layoutDimensions.get(node.id) ?? displayDim;
    const layout = graph.node(node.id);

    if (layout) {
      positions.set(node.id, {
        x: layout.x - displayDim.width / 2,
        y: layout.y - layoutDim.height / 2,
      });
      continue;
    }

    const index = processNodes.indexOf(node);
    if (isHierarchical) {
      positions.set(node.id, {
        x: 48 + index * (displayDim.width + HIER_TASK_RANKSEP),
        y: HIER_TASK_LANE_Y,
      });
    } else {
      positions.set(node.id, {
        x: 120,
        y: 48 + index * (layoutDim.height + RAD_TASK_RANKSEP),
      });
    }
  }

  return positions;
};

/** Task 하위 리소스 절대 좌표 배치 */
const layoutResourceNodes = (
  nodes: Node[],
  edges: Edge[],
  processPositions: Map<string, Position>,
  dimensions: Map<string, Dimensions>,
  viewMode: GraphViewMode,
): { positions: Map<string, Position>; tableListMeta: Map<string, TableListMeta> } => {
  const positions = new Map<string, Position>();
  const tableListMeta = new Map<string, TableListMeta>();
  const childrenMap = buildChainChildrenMap(nodes, edges);
  const taskNodes = nodes.filter((node) => getNodeKind(node) === "TASK");

  for (const taskNode of taskNodes) {
    const taskPosition = processPositions.get(taskNode.id);
    if (!taskPosition) {
      continue;
    }

    const taskDim = dimensions.get(taskNode.id) ?? {
      width: GRAPH_NODE_WIDTH,
      height: GRAPH_NODE_HEIGHT,
    };

    const result = layoutTaskResources(
      viewMode,
      taskNode.id,
      taskPosition,
      taskDim,
      nodes,
      childrenMap,
      dimensions,
    );

    for (const [resourceId, position] of result.positions) {
      positions.set(resourceId, position);
    }
    for (const [tableId, meta] of result.tableListMeta) {
      tableListMeta.set(tableId, meta);
    }
  }

  const orphanResources = nodes.filter(
    (node) =>
      isResourceKind(getNodeKind(node)) && !positions.has(node.id),
  );

  for (const [index, resourceNode] of orphanResources.entries()) {
    const kind = getNodeKind(resourceNode);
    const { width, height } = getGraphNodeDimensions(kind);
    positions.set(resourceNode.id, {
      x: 40 + index * (width + 20),
      y: 360 + index * (height + RAD_IF_ITEM_GAP),
    });
  }

  return { positions, tableListMeta };
};

/** 2단계 배치 — Task 흐름 + 하위 리소스 */
export const layoutGraphElements = (
  nodes: Node[],
  edges: Edge[],
  viewMode: GraphViewMode = "hierarchical",
): Node[] => {
  const dimensions = new Map(
    nodes.map((node) => [
      node.id,
      getGraphNodeDimensions(getNodeKind(node), getNodeData(node)),
    ]),
  );

  let allPositions: Map<string, Position>;
  let tableListMeta: Map<string, TableListMeta>;

  if (shouldUseE2eColumnLayout(nodes, viewMode)) {
    const e2eLayout = layoutE2eHierarchicalGraph(nodes, edges, dimensions);
    allPositions = e2eLayout.positions;
    tableListMeta = e2eLayout.tableListMeta;
  } else {
    const processPositions = layoutProcessNodes(
      nodes,
      edges,
      viewMode,
      dimensions,
    );
    const resourceLayout = layoutResourceNodes(
      nodes,
      edges,
      processPositions,
      dimensions,
      viewMode,
    );
    allPositions = new Map([
      ...processPositions,
      ...resourceLayout.positions,
    ]);
    tableListMeta = resourceLayout.tableListMeta;

    resolveNodeCollisions([...allPositions.keys()], allPositions, dimensions);
  }

  return nodes.map((node) => {
    const kind = getNodeKind(node);
    const nodeData = getNodeData(node);
    const { width, height } = getGraphNodeDimensions(kind, nodeData);
    const position = allPositions.get(node.id) ?? { x: 0, y: 0 };
    const listMeta = tableListMeta.get(node.id);

    return {
      ...node,
      data: {
        ...nodeData,
        label: nodeData?.label ?? "",
        kind: nodeData?.kind ?? "TASK",
        tableListMeta: listMeta,
      },
      position: {
        x: position.x,
        y: position.y,
      },
      width,
      height,
      zIndex: isProcessKind(kind) ? 2 : 1,
    };
  });
};
