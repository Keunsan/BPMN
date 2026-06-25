import type { ProcessNodeTree } from "@/types/process";

/** L4 선행 정렬용 task_predecessor 행 */
export type TaskPredecessorSortRow = {
  nodeId: number;
  predecessorNodeId: number;
};

/** L4 선행 정렬용 노드 메타 */
export type L4SortNode = {
  nodeId: number;
};

const toNodeId = (nodeId: number | string): number => Number(nodeId);

/** L4 선행 프로세스 정렬에 필요한 인덱스 */
export type L4PredecessorIndex = {
  /** nodeId → 형제 L4 기준으로 해석된 선행 nodeId */
  primaryPredecessorByNode: Map<number, number>;
  /** 선행 관계가 하나라도 등록된 nodeId */
  nodesWithPredecessor: Set<number>;
};

/** task_predecessor 행과 형제 메타로 L4 정렬 인덱스를 만든다 */
export const buildL4PredecessorIndexForSiblings = (
  siblings: L4SortNode[],
  rows: TaskPredecessorSortRow[],
): L4PredecessorIndex => {
  const siblingIds = new Set(siblings.map((node) => toNodeId(node.nodeId)));
  const primaryPredecessorByNode = new Map<number, number>();
  const nodesWithPredecessor = new Set<number>();
  const rowsByNodeId = new Map<number, TaskPredecessorSortRow[]>();

  for (const row of rows) {
    const rowNodeId = toNodeId(row.nodeId);
    if (!siblingIds.has(rowNodeId)) {
      continue;
    }
    const nodeRows = rowsByNodeId.get(rowNodeId) ?? [];
    nodeRows.push({
      nodeId: rowNodeId,
      predecessorNodeId: toNodeId(row.predecessorNodeId),
    });
    rowsByNodeId.set(rowNodeId, nodeRows);
  }

  for (const sibling of siblings) {
    const siblingNodeId = toNodeId(sibling.nodeId);
    const sourceRows = rowsByNodeId.get(siblingNodeId) ?? [];
    if (sourceRows.length === 0) {
      continue;
    }

    const predecessorNodeId = sourceRows[0]!.predecessorNodeId;
    if (!siblingIds.has(predecessorNodeId)) {
      continue;
    }

    nodesWithPredecessor.add(siblingNodeId);
    primaryPredecessorByNode.set(siblingNodeId, predecessorNodeId);
  }

  return {
    primaryPredecessorByNode,
    nodesWithPredecessor,
  };
};

/** 동일 L3 아래 L4 형제를 선행 프로세스 기준으로 정렬한다 */
export const sortL4SiblingsByPredecessor = <T extends { nodeId: number }>(
  siblings: T[],
  index: L4PredecessorIndex,
  getSiblingPredecessor: (nodeId: number) => number | null,
): T[] => {
  if (siblings.length <= 1) {
    return siblings;
  }

  const { nodesWithPredecessor } = index;
  const nodeById = new Map(siblings.map((node) => [toNodeId(node.nodeId), node]));
  const positionByNodeId = new Map<number, number>();

  const result: T[] = [];
  const append = (node: T) => {
    const nodeId = toNodeId(node.nodeId);
    positionByNodeId.set(nodeId, result.length);
    result.push(node);
  };

  const withoutPredecessor = siblings
    .filter((node) => !nodesWithPredecessor.has(toNodeId(node.nodeId)))
    .sort((left, right) => toNodeId(left.nodeId) - toNodeId(right.nodeId));
  for (const node of withoutPredecessor) {
    append(node);
  }

  const placed = new Set(withoutPredecessor.map((node) => toNodeId(node.nodeId)));
  const pending = new Set(
    siblings
      .filter((node) => nodesWithPredecessor.has(toNodeId(node.nodeId)))
      .map((node) => toNodeId(node.nodeId)),
  );

  const predecessorPosition = (nodeId: number): number => {
    const predecessor = getSiblingPredecessor(nodeId);
    if (predecessor == null) {
      return -1;
    }
    return positionByNodeId.get(predecessor) ?? Number.MAX_SAFE_INTEGER;
  };

  while (pending.size > 0) {
    let ready = [...pending].filter((nodeId) => {
      const predecessor = getSiblingPredecessor(nodeId);
      return predecessor == null || placed.has(predecessor);
    });

    if (ready.length === 0) {
      const forcedNodeId = [...pending].sort((left, right) => left - right)[0]!;
      append(nodeById.get(forcedNodeId)!);
      placed.add(forcedNodeId);
      pending.delete(forcedNodeId);
      continue;
    }

    ready = ready.sort((left, right) => {
      const leftPosition = predecessorPosition(left);
      const rightPosition = predecessorPosition(right);
      if (leftPosition !== rightPosition) {
        return leftPosition - rightPosition;
      }
      return left - right;
    });

    for (const nodeId of ready) {
      append(nodeById.get(nodeId)!);
      placed.add(nodeId);
      pending.delete(nodeId);
    }
  }

  return result;
};

/** L3 하위 전체 L4 형제 기준 선행 정렬 순서(nodeId)를 계산한다 */
export const computeSortedL4NodeIds = (
  fullSiblingNodes: L4SortNode[],
  predecessorRows: TaskPredecessorSortRow[],
): number[] => {
  if (fullSiblingNodes.length <= 1) {
    return fullSiblingNodes.map((node) => node.nodeId);
  }

  const index = buildL4PredecessorIndexForSiblings(fullSiblingNodes, predecessorRows);
  const getSiblingPredecessor = (nodeId: number | string): number | null =>
    index.primaryPredecessorByNode.get(toNodeId(nodeId)) ?? null;
  const siblings = fullSiblingNodes.map((node) => ({ nodeId: toNodeId(node.nodeId) }));

  return sortL4SiblingsByPredecessor(siblings, index, getSiblingPredecessor).map(
    (item) => item.nodeId,
  );
};

type L4PredecessorSortableItem = {
  nodeId: number;
  processLevel: string;
  parentNodeId: number | null;
};

/** Task 속성 목록 등 L3/L4 혼합 리스트에 L4 선행 정렬을 적용한다 */
export const applyL4PredecessorOrderToList = <T extends L4PredecessorSortableItem>(
  items: T[],
  predecessorRows: TaskPredecessorSortRow[],
  fullSiblingIdsByParent: Map<number, L4SortNode[]>,
): T[] => {
  const l4Items = items.filter((item) => item.processLevel === "L4");
  if (l4Items.length <= 1) {
    return items;
  }

  const itemByNodeId = new Map(
    l4Items.map((item) => [toNodeId(item.nodeId), item]),
  );
  const sortedIdsByParent = new Map<number, number[]>();

  for (const [parentNodeId, fullSiblingNodes] of fullSiblingIdsByParent) {
    if (fullSiblingNodes.length <= 1) {
      continue;
    }
    sortedIdsByParent.set(
      toNodeId(parentNodeId),
      computeSortedL4NodeIds(fullSiblingNodes, predecessorRows),
    );
  }

  const processedParents = new Set<number>();
  const result: T[] = [];

  for (const item of items) {
    if (item.processLevel !== "L4") {
      result.push(item);
      continue;
    }

    const parentNodeId = item.parentNodeId;
    if (parentNodeId == null) {
      result.push(item);
      continue;
    }

    const parentKey = toNodeId(parentNodeId);
    if (processedParents.has(parentKey)) {
      continue;
    }

    processedParents.add(parentKey);
    const sortedIds = sortedIdsByParent.get(parentKey);
    if (!sortedIds) {
      result.push(item);
      continue;
    }

    for (const nodeId of sortedIds) {
      const row = itemByNodeId.get(toNodeId(nodeId));
      if (row) {
        result.push(row);
      }
    }
  }

  return result;
};

/** 트리 전체에 L3 하위 L4 선행 정렬을 적용한다 */
export const applyL4PredecessorOrderToTree = (
  tree: ProcessNodeTree[],
  rows: TaskPredecessorSortRow[],
  fullSiblingNodesByParent: Map<number, L4SortNode[]>,
): ProcessNodeTree[] => {
  const sortChildren = (nodes: ProcessNodeTree[]): ProcessNodeTree[] =>
    nodes.map((node) => {
      const children = node.children?.length ? sortChildren(node.children) : node.children;

      if (node.level !== "L3" || !children?.length) {
        return children ? { ...node, children } : node;
      }

      const l4Children = children.filter((child) => child.level === "L4");
      if (l4Children.length <= 1) {
        return { ...node, children };
      }

      const parentKey = toNodeId(node.nodeId);
      const standardParentKey =
        node.isOverlayVariant && node.variantOf != null
          ? toNodeId(node.variantOf)
          : null;
      const dbSiblings =
        fullSiblingNodesByParent.get(parentKey) ??
        (standardParentKey != null
          ? fullSiblingNodesByParent.get(standardParentKey)
          : undefined);
      const fullSiblingNodes =
        dbSiblings != null && dbSiblings.length > 0
          ? dbSiblings
          : l4Children.map((child) => ({ nodeId: toNodeId(child.nodeId) }));
      const sortedIds = computeSortedL4NodeIds(fullSiblingNodes, rows);
      const childById = new Map(
        l4Children.map((child) => [toNodeId(child.nodeId), child]),
      );
      const sortedL4 = sortedIds
        .map((nodeId) => childById.get(toNodeId(nodeId)))
        .filter((child): child is ProcessNodeTree => child != null);
      const sortedIdSet = new Set(sortedL4.map((child) => toNodeId(child.nodeId)));
      const missingL4 = l4Children.filter(
        (child) => !sortedIdSet.has(toNodeId(child.nodeId)),
      );
      const nonL4Children = children.filter((child) => child.level !== "L4");

      return {
        ...node,
        children: [...sortedL4, ...missingL4, ...nonL4Children],
      };
    });

  return sortChildren(tree);
};

/** 트리에서 L3 nodeId를 수집한다 */
export const collectL3NodeIdsFromTree = (tree: ProcessNodeTree[]): number[] => {
  const ids: number[] = [];

  const walk = (nodes: ProcessNodeTree[]) => {
    for (const node of nodes) {
      if (node.level === "L3") {
        ids.push(toNodeId(node.nodeId));
        if (node.isOverlayVariant && node.variantOf != null) {
          ids.push(toNodeId(node.variantOf));
        }
      }
      if (node.children?.length) {
        walk(node.children);
      }
    }
  };

  walk(tree);
  return ids;
};

/** 선행 조회에 필요한 L4 nodeId를 수집한다 */
export const collectL4PredecessorLookupNodeIds = (
  fullSiblingNodesByParent: Map<number, L4SortNode[]>,
): number[] => {
  const ids = new Set<number>();

  for (const nodes of fullSiblingNodesByParent.values()) {
    for (const node of nodes) {
      ids.add(node.nodeId);
    }
  }

  return [...ids];
};
