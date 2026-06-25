import type { BpmnElementLinkDto } from "@/types/bpmn";

/** BPMN sequence flow로 자동 등록된 task_predecessor.condition_desc 값(DB 동기화 식별용) */
export const BPMN_PREDECESSOR_CONDITION_DESC = "BPMN sequence flow" as const;

/** BPMN 자동 동기화로 설정된 선행 조건 설명인지 판별한다 */
export const isBpmnPredecessorConditionDesc = (
  conditionDesc: string | null | undefined,
): boolean => conditionDesc === BPMN_PREDECESSOR_CONDITION_DESC;

/** UI 표시용 선행 조건 설명 — BPMN 자동 값은 빈 문자열로 정규화한다 */
export const normalizePredecessorConditionDescForDisplay = (
  conditionDesc: string | null | undefined,
): string | null =>
  isBpmnPredecessorConditionDesc(conditionDesc) ? null : (conditionDesc ?? null);

/** BPMN sequence flow에서 도출한 선행 관계 */
export type BpmnFlowPredecessor = {
  nodeId: number;
  predecessorNodeId: number;
};

/** DB·클라이언트 혼용 nodeId를 양의 정수로 정규화한다 */
export const normalizeBpmnLinkedNodeId = (
  nodeId: number | string | null | undefined,
): number | null => {
  if (nodeId == null || nodeId === "") {
    return null;
  }

  const normalized = Number(nodeId);
  return Number.isInteger(normalized) && normalized > 0 ? normalized : null;
};

/** XML 태그에서 속성 값을 읽는다 */
const getXmlAttribute = (tag: string, name: string): string | null => {
  const match = tag.match(new RegExp(`\\b${name}=(["'])(.*?)\\1`));
  return match?.[2] ?? null;
};

/** BPMN XML에서 sequence flow 목록을 파싱한다 */
export const parseSequenceFlows = (
  bpmnXml: string | null,
): Array<{ sourceRef: string; targetRef: string }> => {
  if (!bpmnXml?.trim()) {
    return [];
  }

  const flows: Array<{ sourceRef: string; targetRef: string }> = [];
  const sequenceFlowPattern = /<bpmn:sequenceFlow\b[^>]*\/?>/gi;
  let match: RegExpExecArray | null;

  while ((match = sequenceFlowPattern.exec(bpmnXml)) !== null) {
    const tag = match[0];
    const sourceRef = getXmlAttribute(tag, "sourceRef");
    const targetRef = getXmlAttribute(tag, "targetRef");
    if (sourceRef && targetRef) {
      flows.push({ sourceRef, targetRef });
    }
  }

  return flows;
};

const buildIncomingAdjacency = (
  flows: Array<{ sourceRef: string; targetRef: string }>,
): Map<string, string[]> => {
  const incoming = new Map<string, string[]>();

  for (const flow of flows) {
    const list = incoming.get(flow.targetRef) ?? [];
    list.push(flow.sourceRef);
    incoming.set(flow.targetRef, list);
  }

  return incoming;
};

/** 게이트웨이·이벤트 등 비연결 요소를 건너뛰고 직전 연결 프로세스 노드를 찾는다 */
const findImmediateLinkedPredecessors = (
  targetBpmnId: string,
  linkedByBpmnId: Map<string, number>,
  incoming: Map<string, string[]>,
): number[] => {
  const predecessors = new Set<number>();
  const visited = new Set<string>();
  const stack = [...(incoming.get(targetBpmnId) ?? [])];

  while (stack.length > 0) {
    const current = stack.pop()!;
    if (visited.has(current)) {
      continue;
    }
    visited.add(current);

    const linkedNodeId = linkedByBpmnId.get(current);
    if (linkedNodeId != null) {
      predecessors.add(linkedNodeId);
      continue;
    }

    for (const prev of incoming.get(current) ?? []) {
      if (!visited.has(prev)) {
        stack.push(prev);
      }
    }
  }

  return [...predecessors];
};

/** BPMN sequence flow와 요소 연결로 task_predecessor 후보를 도출한다 */
export const derivePredecessorsFromBpmn = (
  bpmnXml: string | null,
  elements: BpmnElementLinkDto[],
): BpmnFlowPredecessor[] => {
  const linkedByBpmnId = new Map<string, number>();

  for (const element of elements) {
    const linkedNodeId = normalizeBpmnLinkedNodeId(element.linkedNodeId);
    if (linkedNodeId != null) {
      linkedByBpmnId.set(element.elementBpmnId, linkedNodeId);
    }
  }

  const flows = parseSequenceFlows(bpmnXml);
  const incoming = buildIncomingAdjacency(flows);
  const seen = new Set<string>();
  const result: BpmnFlowPredecessor[] = [];

  for (const [targetBpmnId, nodeId] of linkedByBpmnId) {
    for (const predecessorNodeId of findImmediateLinkedPredecessors(
      targetBpmnId,
      linkedByBpmnId,
      incoming,
    )) {
      if (predecessorNodeId === nodeId) {
        continue;
      }

      const key = `${nodeId}:${predecessorNodeId}`;
      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      result.push({ nodeId, predecessorNodeId });
    }
  }

  return result;
};

/** BPMN 요소 연결 목록에서 linkedNodeId를 수집한다 */
export const collectLinkedNodeIds = (
  elements: BpmnElementLinkDto[],
): number[] => {
  const ids = new Set<number>();

  for (const element of elements) {
    const linkedNodeId = normalizeBpmnLinkedNodeId(element.linkedNodeId);
    if (linkedNodeId != null) {
      ids.add(linkedNodeId);
    }
  }

  return [...ids];
};
