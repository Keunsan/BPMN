import { useCallback, useMemo, useState } from "react";

import {
  getExpandedLevels,
  setTreeExpansionToLevel,
  type ProcessTreeExpandable,
} from "@/lib/utils/process-tree-expansion";
import type { ProcessLevel } from "@/types/process";

type UseProcessTreeExpansionOptions = {
  /** 최초 트리 로드 시 자동 펼칠 노드 ID */
  initialExpandedIds?: number[];
};

/** 프로세스 트리 펼침 상태 및 레벨별 토글 */
export const useProcessTreeExpansion = (
  tree: ProcessTreeExpandable[] | undefined,
  options: UseProcessTreeExpansionOptions = {},
) => {
  const { initialExpandedIds = [] } = options;
  const [expandedIds, setExpandedIds] = useState<Set<number>>(
    () => new Set(initialExpandedIds),
  );

  const expandedLevels = useMemo(
    () => (tree?.length ? getExpandedLevels(tree, expandedIds) : new Set<ProcessLevel>()),
    [tree, expandedIds],
  );

  const onToggleNode = useCallback((nodeId: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  const onToggleLevel = useCallback(
    (level: ProcessLevel) => {
      if (!tree?.length) {
        return;
      }
      setExpandedIds((prev) => setTreeExpansionToLevel(tree, prev, level));
    },
    [tree],
  );

  const setExpandedIdsFromTree = useCallback((ids: number[]) => {
    setExpandedIds(new Set(ids));
  }, []);

  return {
    expandedIds,
    expandedLevels,
    onToggleNode,
    onToggleLevel,
    setExpandedIds: setExpandedIdsFromTree,
  };
};
