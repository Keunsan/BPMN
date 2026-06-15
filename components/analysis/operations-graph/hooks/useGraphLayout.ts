import dagre from "@dagrejs/dagre";
import type { Edge, Node } from "@xyflow/react";

import type { GraphEdgeData } from "@/components/analysis/operations-graph/canvas/GraphEdgeLine";
import type { GraphNodeData } from "@/components/analysis/operations-graph/canvas/GraphNodeCard";
import { GRAPH_NODE_DIMENSIONS, estimateProcessNodeWidth } from "@/components/analysis/operations-graph/canvas/graph-style-tokens";
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

/** Task 노드 간 dagre 간격 */
const TASK_NODESEP = 28;
const TASK_RANKSEP = 48;
/** Task → 리소스 밴드 분리 간격 */
const TASK_TO_APP_GAP = 132;
const APP_HORIZONTAL_GAP = 18;
const APP_TO_TABLE_LIST_GAP = 64;
const TABLE_LIST_ITEM_GAP = 3;
const TABLE_TO_INTERFACE_GAP = 36;
const INTERFACE_ITEM_GAP = 10;

type Position = { x: number; y: number };
type Dimensions = { width: number; height: number };

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

const getNodeById = (nodes: Node[], nodeId: string): Node | undefined =>
  nodes.find((node) => node.id === nodeId);

/** 프로세스 노드만 dagre로 배치한다 */
const layoutProcessNodes = (
  nodes: Node[],
  edges: Edge[],
  viewMode: GraphViewMode,
): Map<string, Position> => {
  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({
    rankdir: viewMode === "hierarchical" ? "LR" : "TB",
    nodesep: TASK_NODESEP,
    ranksep: TASK_RANKSEP,
    marginx: 32,
    marginy: 200,
  });

  const processNodes = nodes.filter((node) =>
    isProcessKind(getNodeKind(node)),
  );
  const processNodeIds = new Set(processNodes.map((node) => node.id));

  for (const node of processNodes) {
    const kind = getNodeKind(node);
    const { width, height } = getGraphNodeDimensions(kind, getNodeData(node));
    graph.setNode(node.id, { width, height });
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
    const { width, height } = getGraphNodeDimensions(kind, nodeData);
    const layout = graph.node(node.id);

    if (layout) {
      positions.set(node.id, {
        x: layout.x - width / 2,
        y: layout.y - height / 2,
      });
      continue;
    }

    const index = processNodes.indexOf(node);
    const nodeWidth = width;
    if (viewMode === "hierarchical") {
      positions.set(node.id, {
        x: 32 + index * (nodeWidth + TASK_RANKSEP),
        y: 80,
      });
    } else {
      positions.set(node.id, {
        x: 120,
        y: 32 + index * (GRAPH_NODE_HEIGHT + TASK_RANKSEP),
      });
    }
  }

  return positions;
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

type TableListMeta = { index: number; total: number };

const placeStaggeredBelow = (
  parentPosition: Position,
  parentWidth: number,
  parentHeight: number,
  childWidth: number,
  index: number,
  total: number,
  gap: number,
): Position => {
  const stagger = (index - (total - 1) / 2) * (childWidth + APP_HORIZONTAL_GAP);
  const parentCenter = parentPosition.x + parentWidth / 2;

  return {
    x: parentCenter - childWidth / 2 + stagger,
    y: parentPosition.y + parentHeight + gap,
  };
};

/** TASK → APP → TABLE → IF 세로 스택 배치 */
const layoutResourceNodes = (
  nodes: Node[],
  edges: Edge[],
  processPositions: Map<string, Position>,
  dimensions: Map<string, Dimensions>,
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

    const appIds = (childrenMap.get(taskNode.id) ?? []).filter(
      (childId) => getNodeKind(getNodeById(nodes, childId)) === "APPLICATION",
    );

    const taskDim = dimensions.get(taskNode.id) ?? {
      width: GRAPH_NODE_WIDTH,
      height: GRAPH_NODE_HEIGHT,
    };

    for (const [appIndex, appId] of appIds.entries()) {
      const appDim = dimensions.get(appId) ?? {
        width: GRAPH_RESOURCE_WIDTH,
        height: GRAPH_RESOURCE_HEIGHT,
      };

      if (!positions.has(appId)) {
        positions.set(
          appId,
          placeStaggeredBelow(
            taskPosition,
            taskDim.width,
            taskDim.height,
            appDim.width,
            appIndex,
            appIds.length,
            TASK_TO_APP_GAP,
          ),
        );
      }

      const appPosition = positions.get(appId);
      if (!appPosition) {
        continue;
      }

      const tableIds = (childrenMap.get(appId) ?? []).filter(
        (childId) => getNodeKind(getNodeById(nodes, childId)) === "TABLE",
      );

      const tableDim = {
        width: GRAPH_RESOURCE_WIDTH,
        height: GRAPH_TABLE_LIST_ITEM_HEIGHT,
      };
      const tableListTop =
        appPosition.y + appDim.height + APP_TO_TABLE_LIST_GAP;

      for (const [tableIndex, tableId] of tableIds.entries()) {
        if (!positions.has(tableId)) {
          positions.set(tableId, {
            x: appPosition.x,
            y:
              tableListTop +
              tableIndex * (tableDim.height + TABLE_LIST_ITEM_GAP),
          });
          tableListMeta.set(tableId, {
            index: tableIndex,
            total: tableIds.length,
          });
        }
      }

      const tableBlockHeight =
        tableIds.length > 0
          ? tableIds.length * tableDim.height +
            (tableIds.length - 1) * TABLE_LIST_ITEM_GAP
          : 0;
      const interfaceBaseY =
        tableIds.length > 0
          ? tableListTop + tableBlockHeight + TABLE_TO_INTERFACE_GAP
          : appPosition.y + appDim.height + TABLE_TO_INTERFACE_GAP;
      let nextInterfaceY = interfaceBaseY;

      for (const tableId of tableIds) {
        const interfaceIds = (childrenMap.get(tableId) ?? []).filter(
          (childId) =>
            getNodeKind(getNodeById(nodes, childId)) === "INTERFACE",
        );

        for (const interfaceId of interfaceIds) {
          const ifDim = dimensions.get(interfaceId) ?? {
            width: GRAPH_RESOURCE_WIDTH,
            height: GRAPH_RESOURCE_HEIGHT,
          };
          positions.set(interfaceId, {
            x: appPosition.x,
            y: nextInterfaceY,
          });
          nextInterfaceY += ifDim.height + INTERFACE_ITEM_GAP;
        }
      }

      const directInterfaceIds = (childrenMap.get(appId) ?? []).filter(
        (childId) =>
          getNodeKind(getNodeById(nodes, childId)) === "INTERFACE",
      );

      for (const interfaceId of directInterfaceIds) {
        if (positions.has(interfaceId)) {
          continue;
        }
        const ifDim = dimensions.get(interfaceId) ?? {
          width: GRAPH_RESOURCE_WIDTH,
          height: GRAPH_RESOURCE_HEIGHT,
        };
        positions.set(interfaceId, {
          x: appPosition.x,
          y: nextInterfaceY,
        });
        nextInterfaceY += ifDim.height + INTERFACE_ITEM_GAP;
      }
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
      x: 40 + index * (width + APP_HORIZONTAL_GAP),
      y: 360 + index * (height + INTERFACE_ITEM_GAP),
    });
  }

  return { positions, tableListMeta };
};

/** 2단계 배치 — Task 흐름 + 하위 리소스 체인 */
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

  const processPositions = layoutProcessNodes(nodes, edges, viewMode);
  const { positions: resourcePositions, tableListMeta } = layoutResourceNodes(
    nodes,
    edges,
    processPositions,
    dimensions,
  );

  const allPositions = new Map([...processPositions, ...resourcePositions]);

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
    };
  });
};
