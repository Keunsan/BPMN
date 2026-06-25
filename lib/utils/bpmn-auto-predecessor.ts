import { derivePredecessorsFromBpmn } from "@/lib/utils/bpmn-predecessor-sync";
import type { BpmnElementLinkDto, ProcessLinkInfo } from "@/types/bpmn";

/** BPMN 에디터 연결 맵을 선행 동기화용 요소 DTO로 변환한다 */
export const linksRecordToElementDtos = (
  links: Record<string, ProcessLinkInfo>,
): BpmnElementLinkDto[] =>
  Object.entries(links).map(([elementBpmnId, link]) => ({
    elementBpmnId,
    elementType: (link.linkKind === "L3_CALL"
      ? "CALL_ACTIVITY"
      : "USER_TASK") as BpmnElementLinkDto["elementType"],
    elementName: link.name,
    linkedNodeId: link.nodeId,
    properties: null,
  }));

/** 다이어그램에서 특정 L4 노드의 BPMN 선행 프로세스 nodeId 목록을 도출한다 */
export const resolveBpmnPredecessorNodeIds = (
  bpmnXml: string | null,
  nodeId: number,
  links: Record<string, ProcessLinkInfo>,
): number[] => {
  const elements = linksRecordToElementDtos(links);
  const pairs = derivePredecessorsFromBpmn(bpmnXml, elements).filter(
    (pair) => pair.nodeId === nodeId,
  );

  const seen = new Set<number>();
  const result: number[] = [];

  for (const pair of pairs) {
    if (seen.has(pair.predecessorNodeId)) {
      continue;
    }
    seen.add(pair.predecessorNodeId);
    result.push(pair.predecessorNodeId);
  }

  return result;
};
