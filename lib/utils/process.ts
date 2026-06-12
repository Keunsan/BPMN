import type { ProcessNodeTree } from "@/types/process";

/** flat 목록을 트리 구조로 변환 */
export const buildProcessTree = (
  nodes: ProcessNodeTree[],
): ProcessNodeTree[] => {
  const map = new Map<number, ProcessNodeTree>();
  const roots: ProcessNodeTree[] = [];

  for (const node of nodes) {
    map.set(node.nodeId, { ...node, children: [] });
  }

  for (const node of map.values()) {
    if (node.parentNodeId && map.has(node.parentNodeId)) {
      map.get(node.parentNodeId)!.children!.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortChildren = (items: ProcessNodeTree[]) => {
    items.sort((a, b) => a.sortOrder - b.sortOrder || a.code.localeCompare(b.code));
    for (const item of items) {
      if (item.children?.length) {
        sortChildren(item.children);
      }
    }
  };

  sortChildren(roots);
  return roots;
};

/** Major.Minor.Patch 버전 bump */
export const bumpVersion = (
  current: string | null,
  type: "minor" | "patch" = "minor",
): string => {
  const parts = (current ?? "1.0.0").split(".").map(Number);
  const [major = 1, minor = 0, patch = 0] = parts;

  if (type === "patch") {
    return `${major}.${minor}.${patch + 1}`;
  }
  return `${major}.${minor + 1}.0`;
};

/** scope overlay 트리 — 표준 노드를 기준으로 변형을 대체한다 */
export const buildOverlayProcessTree = (
  standardNodes: ProcessNodeTree[],
  variantNodes: ProcessNodeTree[],
): ProcessNodeTree[] => {
  const standardById = new Map(standardNodes.map((node) => [node.nodeId, node]));
  const variantByStandardId = new Map(
    variantNodes
      .filter((node) => node.variantOf != null)
      .map((node) => [node.variantOf!, node]),
  );

  const effectiveByStandardId = new Map<number, ProcessNodeTree>();

  for (const node of standardNodes) {
    if (node.level === "L1" || node.level === "L2") {
      effectiveByStandardId.set(node.nodeId, {
        ...node,
        isOverlayVariant: false,
      });
      continue;
    }

    const variant = variantByStandardId.get(node.nodeId);
    if (variant) {
      effectiveByStandardId.set(node.nodeId, {
        ...variant,
        isOverlayVariant: true,
      });
    } else {
      effectiveByStandardId.set(node.nodeId, {
        ...node,
        isOverlayVariant: false,
      });
    }
  }

  const getEffectiveParentId = (standardParentId: number | null): number | null => {
    if (standardParentId == null) {
      return null;
    }
    const parentStandard = standardById.get(standardParentId);
    if (!parentStandard) {
      return standardParentId;
    }
    return effectiveByStandardId.get(standardParentId)?.nodeId ?? standardParentId;
  };

  const effectiveNodes = standardNodes.map((node) => {
    const effective = effectiveByStandardId.get(node.nodeId)!;
    return {
      ...effective,
      parentNodeId: getEffectiveParentId(node.parentNodeId),
    };
  });

  return buildProcessTree(effectiveNodes);
};

/** 다음 레벨 계산 */
export const getNextLevel = (
  parentLevel: string | null,
): "L1" | "L2" | "L3" | "L4" => {
  if (!parentLevel) return "L1";
  const map: Record<string, "L1" | "L2" | "L3" | "L4"> = {
    L1: "L2",
    L2: "L3",
    L3: "L4",
    L4: "L4",
  };
  return map[parentLevel] ?? "L1";
};
