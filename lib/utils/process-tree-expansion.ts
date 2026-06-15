import type { ProcessLevel, ProcessNodeTree } from "@/types/process";

/** L1~L4 순서 */
export const PROCESS_LEVEL_ORDER: Record<ProcessLevel, number> = {
  L1: 1,
  L2: 2,
  L3: 3,
  L4: 4,
};

export const PROCESS_LEVELS: ProcessLevel[] = ["L1", "L2", "L3", "L4"];

export type ProcessTreeExpandable = Pick<
  ProcessNodeTree,
  "nodeId" | "level" | "children"
>;

/**
 * 레벨 선택 시 펼칠 노드 ID 수집.
 * targetLevel=L3이면 L1·L2만 펼쳐 L3 노드까지 보이고, L4는 접힌 상태로 유지한다.
 */
export const collectExpandableIdsUpToLevel = (
  tree: ProcessTreeExpandable[],
  targetLevel: ProcessLevel,
): number[] => {
  const targetOrder = PROCESS_LEVEL_ORDER[targetLevel];
  const ids: number[] = [];

  const walk = (nodes: ProcessTreeExpandable[]) => {
    for (const node of nodes) {
      const hasChildren = (node.children?.length ?? 0) > 0;
      if (hasChildren && PROCESS_LEVEL_ORDER[node.level] < targetOrder) {
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

/** 해당 레벨까지 모두 펼쳐져 있는지 확인 */
export const isTreeExpandedUpToLevel = (
  tree: ProcessTreeExpandable[],
  expandedIds: Set<number>,
  targetLevel: ProcessLevel,
): boolean => {
  const requiredIds = collectExpandableIdsUpToLevel(tree, targetLevel);
  if (requiredIds.length === 0) {
    return expandedIds.size === 0;
  }
  return requiredIds.every((id) => expandedIds.has(id));
};

/** 선택 레벨에 맞게 펼침 상태를 설정한다 (토글 없음) */
export const setTreeExpansionToLevel = (
  tree: ProcessTreeExpandable[],
  _expandedIds: Set<number>,
  targetLevel: ProcessLevel,
): Set<number> => {
  return new Set(collectExpandableIdsUpToLevel(tree, targetLevel));
};

/** @deprecated setTreeExpansionToLevel 사용 */
export const toggleTreeExpansionUpToLevel = setTreeExpansionToLevel;

/** 트리에 존재하는 레벨 집합 */
const collectLevelsInTree = (
  tree: ProcessTreeExpandable[],
): Set<ProcessLevel> => {
  const levels = new Set<ProcessLevel>();

  const walk = (nodes: ProcessTreeExpandable[]) => {
    for (const node of nodes) {
      levels.add(node.level);
      if (node.children?.length) {
        walk(node.children);
      }
    }
  };

  walk(tree);
  return levels;
};

/** 현재 펼쳐진 레벨 집합 — UI 활성 상태 표시용 */
export const getExpandedLevels = (
  tree: ProcessTreeExpandable[],
  expandedIds: Set<number>,
): Set<ProcessLevel> => {
  const expanded = new Set<ProcessLevel>();
  for (const level of PROCESS_LEVELS) {
    if (isTreeExpandedUpToLevel(tree, expandedIds, level)) {
      expanded.add(level);
    }
  }
  return expanded;
};

/** 트리에 해당 레벨 노드가 없으면 컨트롤 비활성화 */
export const getDisabledTreeLevels = (
  tree: ProcessTreeExpandable[],
): Set<ProcessLevel> => {
  const present = collectLevelsInTree(tree);
  const disabled = new Set<ProcessLevel>();
  for (const level of PROCESS_LEVELS) {
    if (!present.has(level)) {
      disabled.add(level);
    }
  }
  return disabled;
};
