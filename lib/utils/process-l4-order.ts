import type { ProcessNodeTree } from "@/types/process";

/** L4 선행 프로세스 정렬에 필요한 인덱스 */
export type L4PredecessorIndex = {
  /** nodeId → 대표 선행 nodeId (predecessor_id 최소) */
  primaryPredecessorByNode: Map<number, number>;
  /** 선행 관계가 하나라도 등록된 nodeId */
  nodesWithPredecessor: Set<number>;
  /** 형제 L4가 선행으로 지정한 nodeId 집합 */
  referencedAsSiblingPredecessor: Set<number>;
};

/** task_predecessor 행 목록으로 L4 정렬 인덱스를 만든다 */
export const buildL4PredecessorIndex = (
  rows: Array<{ nodeId: number; predecessorNodeId: number }>,
  siblingIds: Set<number>,
): L4PredecessorIndex => {
  const primaryPredecessorByNode = new Map<number, number>();
  const nodesWithPredecessor = new Set<number>();
  const referencedAsSiblingPredecessor = new Set<number>();

  for (const row of rows) {
    nodesWithPredecessor.add(row.nodeId);
    if (!primaryPredecessorByNode.has(row.nodeId)) {
      primaryPredecessorByNode.set(row.nodeId, row.predecessorNodeId);
    }
    if (siblingIds.has(row.predecessorNodeId)) {
      referencedAsSiblingPredecessor.add(row.predecessorNodeId);
    }
  }

  return {
    primaryPredecessorByNode,
    nodesWithPredecessor,
    referencedAsSiblingPredecessor,
  };
};

/** 동일 L3 아래 L4 형제를 선행 프로세스 기준으로 정렬한다 */
export const sortL4SiblingsByPredecessor = <T extends { nodeId: number }>(
  siblings: T[],
  index: L4PredecessorIndex,
): T[] => {
  if (siblings.length <= 1) {
    return siblings;
  }

  const siblingIds = new Set(siblings.map((node) => node.nodeId));
  const { primaryPredecessorByNode, nodesWithPredecessor, referencedAsSiblingPredecessor } =
    index;

  const getSiblingPredecessor = (nodeId: number): number | null => {
    const predecessor = primaryPredecessorByNode.get(nodeId);
    return predecessor != null && siblingIds.has(predecessor) ? predecessor : null;
  };

  const inDegree = new Map<number, number>();
  const successors = new Map<number, number[]>();

  for (const node of siblings) {
    inDegree.set(node.nodeId, 0);
    successors.set(node.nodeId, []);
  }

  for (const node of siblings) {
    const predecessor = getSiblingPredecessor(node.nodeId);
    if (predecessor != null) {
      inDegree.set(node.nodeId, (inDegree.get(node.nodeId) ?? 0) + 1);
      successors.get(predecessor)!.push(node.nodeId);
    }
  }

  const result: T[] = [];
  const placed = new Set<number>();

  const release = (nodeId: number) => {
    for (const successorId of successors.get(nodeId) ?? []) {
      inDegree.set(successorId, (inDegree.get(successorId) ?? 1) - 1);
    }
  };

  const pickReady = (): T | null => {
    const ready = siblings.filter(
      (node) => !placed.has(node.nodeId) && (inDegree.get(node.nodeId) ?? 0) === 0,
    );
    if (ready.length === 0) {
      return null;
    }

    ready.sort((left, right) => {
      const leftPredecessor = getSiblingPredecessor(left.nodeId) ?? -1;
      const rightPredecessor = getSiblingPredecessor(right.nodeId) ?? -1;
      if (leftPredecessor !== rightPredecessor) {
        return leftPredecessor - rightPredecessor;
      }
      return left.nodeId - right.nodeId;
    });

    return ready[0] ?? null;
  };

  const heads = siblings
    .filter(
      (node) =>
        !nodesWithPredecessor.has(node.nodeId) &&
        referencedAsSiblingPredecessor.has(node.nodeId),
    )
    .sort((left, right) => left.nodeId - right.nodeId);

  for (const head of heads) {
    result.push(head);
    placed.add(head.nodeId);
    release(head.nodeId);
  }

  while (true) {
    const next = pickReady();
    if (!next) {
      break;
    }
    result.push(next);
    placed.add(next.nodeId);
    release(next.nodeId);
  }

  const remaining = siblings
    .filter((node) => !placed.has(node.nodeId))
    .sort((left, right) => {
      const leftHasPredecessor = nodesWithPredecessor.has(left.nodeId);
      const rightHasPredecessor = nodesWithPredecessor.has(right.nodeId);
      if (leftHasPredecessor !== rightHasPredecessor) {
        return leftHasPredecessor ? 1 : -1;
      }

      const leftPredecessor = primaryPredecessorByNode.get(left.nodeId) ?? -1;
      const rightPredecessor = primaryPredecessorByNode.get(right.nodeId) ?? -1;
      if (leftPredecessor !== rightPredecessor) {
        return leftPredecessor - rightPredecessor;
      }

      return left.nodeId - right.nodeId;
    });

  return [...result, ...remaining];
};

type L4PredecessorSortableItem = {
  nodeId: number;
  processLevel: string;
  parentCode: string | null;
};

/** Task 속성 목록 등 L3/L4 혼합 리스트에 L4 선행 정렬을 적용한다 */
export const applyL4PredecessorOrderToList = <T extends L4PredecessorSortableItem>(
  items: T[],
  predecessorRows: Array<{ nodeId: number; predecessorNodeId: number }>,
): T[] => {
  const l4Items = items.filter((item) => item.processLevel === "L4");
  if (l4Items.length <= 1) {
    return items;
  }

  const groups = new Map<string, T[]>();
  for (const item of l4Items) {
    const key = item.parentCode ?? `__node_${item.nodeId}`;
    const group = groups.get(key) ?? [];
    group.push(item);
    groups.set(key, group);
  }

  const sortedGroups = new Map<string, T[]>();
  for (const [key, group] of groups) {
    if (group.length <= 1) {
      sortedGroups.set(key, group);
      continue;
    }

    const siblingIds = new Set(group.map((item) => item.nodeId));
    const siblingRows = predecessorRows.filter((row) => siblingIds.has(row.nodeId));
    const index = buildL4PredecessorIndex(siblingRows, siblingIds);
    sortedGroups.set(key, sortL4SiblingsByPredecessor(group, index));
  }

  const processedParents = new Set<string>();
  const result: T[] = [];

  for (const item of items) {
    if (item.processLevel !== "L4") {
      result.push(item);
      continue;
    }

    const key = item.parentCode ?? `__node_${item.nodeId}`;
    if (processedParents.has(key)) {
      continue;
    }

    processedParents.add(key);
    result.push(...(sortedGroups.get(key) ?? [item]));
  }

  return result;
};

/** 트리 전체에 L3 하위 L4 선행 정렬을 적용한다 */
export const applyL4PredecessorOrderToTree = (
  tree: ProcessNodeTree[],
  rows: Array<{ nodeId: number; predecessorNodeId: number }>,
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

      const siblingIds = new Set(l4Children.map((child) => child.nodeId));
      const siblingRows = rows.filter((row) => siblingIds.has(row.nodeId));
      const index = buildL4PredecessorIndex(siblingRows, siblingIds);
      const sortedL4 = sortL4SiblingsByPredecessor(l4Children, index);
      const nonL4Children = children.filter((child) => child.level !== "L4");

      return {
        ...node,
        children: [...sortedL4, ...nonL4Children],
      };
    });

  return sortChildren(tree);
};

/** 트리에서 L4 nodeId를 수집한다 */
export const collectL4NodeIdsFromTree = (tree: ProcessNodeTree[]): number[] => {
  const ids: number[] = [];

  const walk = (nodes: ProcessNodeTree[]) => {
    for (const node of nodes) {
      if (node.level === "L4") {
        ids.push(node.nodeId);
      }
      if (node.children?.length) {
        walk(node.children);
      }
    }
  };

  walk(tree);
  return ids;
};
