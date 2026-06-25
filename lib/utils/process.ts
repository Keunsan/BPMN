import type { ProcessNodeTree, ProcessTreeViewMode } from "@/types/process";

import type { ProcessScopePair } from "@/lib/utils/process-scope";
import {
  isBaseVisibleInCatalogView,
  isBaseVisibleInEnterpriseView,
  isBaseVisibleInOrgView,
  isEnterpriseScope,
  normalizeProcessScope,
} from "@/lib/utils/process-scope";

/** RSC → Client props 전달용 — Date 등 비직렬화 값을 JSON 호환 형태로 변환 */
export const serializeProcessTreeForClient = (
  tree: ProcessNodeTree[],
): ProcessNodeTree[] => JSON.parse(JSON.stringify(tree)) as ProcessNodeTree[];

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

/** 필터 파라미터로 hybrid 트리 조회 모드를 결정한다 */
export const resolveProcessTreeViewMode = (
  companyCode?: string,
  businessUnitCode?: string,
): ProcessTreeViewMode => {
  const company = companyCode?.trim();
  const businessUnit = businessUnitCode?.trim();
  if (!company || !businessUnit) {
    return "catalog";
  }
  if (isEnterpriseScope(company, businessUnit)) {
    return "enterprise";
  }
  return "organization";
};

/** hybrid 트리 — 전체 카탈로그 / 전사 공통 / 조직 E2E */
export const buildHybridProcessTree = (
  baseNodes: ProcessNodeTree[],
  variantNodes: ProcessNodeTree[],
  viewMode: ProcessTreeViewMode,
  orgScope?: ProcessScopePair,
): ProcessNodeTree[] => {
  if (viewMode === "catalog") {
    return buildProcessTree(
      baseNodes.filter((node) => isBaseVisibleInCatalogView(node)),
    );
  }

  if (viewMode === "enterprise") {
    return buildProcessTree(
      baseNodes.filter((node) => isBaseVisibleInEnterpriseView(node)),
    );
  }

  const scope = normalizeProcessScope(
    orgScope?.companyCode,
    orgScope?.businessUnitCode,
  );
  const orgVariants = variantNodes.filter((variant) => {
    const variantScope = normalizeProcessScope(
      variant.companyCode,
      variant.businessUnitCode,
    );
    return (
      variantScope.companyCode === scope.companyCode &&
      variantScope.businessUnitCode === scope.businessUnitCode
    );
  });
  const variantByBaseId = new Map(
    orgVariants.map((variant) => [variant.variantOf!, variant]),
  );
  const variantBaseIds = new Set(variantByBaseId.keys());
  const variantIds = new Set(orgVariants.map((variant) => variant.nodeId));
  const included: ProcessNodeTree[] = [];
  const includedIds = new Set<number>();

  const pushNode = (node: ProcessNodeTree, isOverlayVariant = false) => {
    if (includedIds.has(node.nodeId)) {
      return;
    }
    includedIds.add(node.nodeId);
    included.push({ ...node, isOverlayVariant });
  };

  for (const base of baseNodes) {
    if (base.level === "L1" || base.level === "L2") {
      if (isEnterpriseScope(base.companyCode, base.businessUnitCode)) {
        pushNode(base);
      }
      continue;
    }

    if (variantByBaseId.has(base.nodeId)) {
      pushNode(variantByBaseId.get(base.nodeId)!, true);
      continue;
    }

    if (isEnterpriseScope(base.companyCode, base.businessUnitCode)) {
      if (base.level === "L4" && base.parentNodeId) {
        const parent = baseNodes.find((item) => item.nodeId === base.parentNodeId);
        if (parent && variantByBaseId.has(parent.nodeId)) {
          continue;
        }
      }
      pushNode(base);
      continue;
    }

    if (
      isBaseVisibleInOrgView(
        base,
        scope.companyCode,
        scope.businessUnitCode,
        variantBaseIds,
      )
    ) {
      pushNode(base);
    }
  }

  for (const base of baseNodes) {
    if (base.parentNodeId && variantIds.has(base.parentNodeId)) {
      pushNode(base);
    }
  }

  return buildProcessTree(included);
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
