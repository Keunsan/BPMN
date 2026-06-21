import type { BpmnElementLinkDto } from "@/types/bpmn";

/** BPMN sequence flow에서 도출한 선행 관계 */
export type BpmnFlowPredecessor = {
  nodeId: number;
  predecessorNodeId: number;
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
    if (element.linkedNodeId) {
      linkedByBpmnId.set(element.elementBpmnId, element.linkedNodeId);
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
