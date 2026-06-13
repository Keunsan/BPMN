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

  const seen = new Set<string>();
  const result: BpmnFlowPredecessor[] = [];

  for (const flow of parseSequenceFlows(bpmnXml)) {
    const predecessorNodeId = linkedByBpmnId.get(flow.sourceRef);
    const nodeId = linkedByBpmnId.get(flow.targetRef);

    if (!predecessorNodeId || !nodeId || predecessorNodeId === nodeId) {
      continue;
    }

    const key = `${nodeId}:${predecessorNodeId}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push({ nodeId, predecessorNodeId });
  }

  return result;
};
