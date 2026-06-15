import type {
  BpmnElementLinkProperties,
  BpmnElementType,
  BpmnLinkKind,
  ProcessLinkInfo,
} from "@/types/bpmn";
import type { ProcessNodeTree } from "@/types/process";

import { isEnterpriseScope } from "@/lib/utils/process-scope";

/** Task 계열 BPMN 요소인지 판별한다 */
export const isBpmnTaskElementType = (type: BpmnElementType): boolean =>
  type === "USER_TASK" ||
  type === "SERVICE_TASK" ||
  type === "MANUAL_TASK" ||
  type === "SCRIPT_TASK";

/** Call Activity BPMN 요소인지 판별한다 */
export const isBpmnCallActivityType = (
  type: BpmnElementType | null | undefined,
): boolean => type === "CALL_ACTIVITY";

/** 연결 대상 레벨에 맞는 linkKind를 반환한다 */
export const resolveBpmnLinkKind = (
  elementType: BpmnElementType,
  level: "L3" | "L4",
): BpmnLinkKind => {
  if (isBpmnCallActivityType(elementType) || level === "L3") {
    return "L3_CALL";
  }
  return "L4_TASK";
};

/** ProcessLinkInfo → bpmn_element.properties */
export const toBpmnElementLinkProperties = (
  link: ProcessLinkInfo,
): BpmnElementLinkProperties => ({
  linkKind: link.linkKind,
  completionScope: link.linkKind === "L3_CALL" ? "FULL" : undefined,
});

/** DB properties 또는 레벨로 ProcessLinkInfo를 복원한다 */
export const parseProcessLinkInfo = (
  linkedNodeId: number,
  code: string,
  name: string,
  elementType: BpmnElementType,
  properties: Record<string, unknown> | null | undefined,
  processLevel?: "L3" | "L4" | null,
): ProcessLinkInfo => {
  const linkKindFromProps = properties?.linkKind;
  const level =
    processLevel ??
    (linkKindFromProps === "L3_CALL" || isBpmnCallActivityType(elementType)
      ? "L3"
      : "L4");

  const linkKind: BpmnLinkKind =
    linkKindFromProps === "L3_CALL" || linkKindFromProps === "L4_TASK"
      ? linkKindFromProps
      : resolveBpmnLinkKind(elementType, level);

  return {
    nodeId: linkedNodeId,
    code,
    name,
    level,
    linkKind,
  };
};

/** BPMN 요소 타입과 연결 정보가 호환되는지 검사한다 */
export const isProcessLinkCompatible = (
  elementType: BpmnElementType | null | undefined,
  link: ProcessLinkInfo,
): boolean => {
  if (!elementType) {
    return true;
  }
  if (isBpmnCallActivityType(elementType)) {
    return link.linkKind === "L3_CALL" && link.level === "L3";
  }
  if (isBpmnTaskElementType(elementType)) {
    return link.linkKind === "L4_TASK" && link.level === "L4";
  }
  return false;
};

/** 프로세스 트리에서 L3 노드를 평탄화한다 */
export const flattenL3Processes = <T extends { level: string; nodeId: number; children?: T[] }>(
  nodes: T[],
  excludeNodeIds: number[] = [],
): T[] => {
  const exclude = new Set(excludeNodeIds);
  const result: T[] = [];

  const walk = (items: T[]) => {
    for (const node of items) {
      if (node.level === "L3" && !exclude.has(node.nodeId)) {
        result.push(node);
      }
      if (node.children?.length) {
        walk(node.children);
      }
    }
  };

  walk(nodes);
  return result;
};

export type ProcessScopeContext = {
  companyCode?: string | null;
  businessUnitCode?: string | null;
};

/** 표준 L3에 대한 스코프 변형 노드를 트리에서 찾는다 */
export const findScopedVariantForStandard = (
  standardNodeId: number,
  nodes: ProcessNodeTree[],
  scope?: ProcessScopeContext,
): ProcessNodeTree | null => {
  if (
    !scope?.companyCode ||
    !scope?.businessUnitCode ||
    isEnterpriseScope(scope.companyCode, scope.businessUnitCode)
  ) {
    return null;
  }

  let found: ProcessNodeTree | null = null;

  const walk = (items: ProcessNodeTree[]) => {
    for (const node of items) {
      if (
        node.variantOf === standardNodeId &&
        node.companyCode === scope.companyCode &&
        node.businessUnitCode === scope.businessUnitCode
      ) {
        found = node;
        return;
      }
      if (node.children?.length) {
        walk(node.children);
      }
    }
  };

  walk(nodes);
  return found;
};

/** Call Activity 연결 시 스코프 변형 L3를 우선 해석한다 */
export const resolveScopedL3LinkTarget = (
  node: ProcessNodeTree,
  tree: ProcessNodeTree[],
  scope?: ProcessScopeContext,
): ProcessNodeTree => {
  if (node.variantOf || node.level !== "L3") {
    return node;
  }

  const variant = findScopedVariantForStandard(node.nodeId, tree, scope);
  return variant ?? node;
};

/** L3 Call Activity용 ProcessLinkInfo를 스코프에 맞게 해석한다 */
export const toScopedL3LinkPayload = (
  node: ProcessNodeTree,
  tree: ProcessNodeTree[],
  scope?: ProcessScopeContext,
): ProcessLinkInfo => {
  const resolved = resolveScopedL3LinkTarget(node, tree, scope);
  return {
    nodeId: resolved.nodeId,
    code: resolved.code,
    name: resolved.name,
    level: "L3",
    linkKind: "L3_CALL",
  };
};
