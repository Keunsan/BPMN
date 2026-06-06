import type { BpmnDiffChangeType, BpmnElementDiff, BpmnElementType } from "@/types/bpmn";

/** bpmn-js 타입 → DB element_type 매핑 */
const BPMN_TYPE_MAP: Record<string, BpmnElementType> = {
  "bpmn:StartEvent": "START_EVENT",
  "bpmn:EndEvent": "END_EVENT",
  "bpmn:IntermediateThrowEvent": "INTERMEDIATE_EVENT",
  "bpmn:IntermediateCatchEvent": "INTERMEDIATE_EVENT",
  "bpmn:UserTask": "USER_TASK",
  "bpmn:ServiceTask": "SERVICE_TASK",
  "bpmn:ManualTask": "MANUAL_TASK",
  "bpmn:ScriptTask": "SCRIPT_TASK",
  "bpmn:ExclusiveGateway": "EXCLUSIVE_GATEWAY",
  "bpmn:ParallelGateway": "PARALLEL_GATEWAY",
  "bpmn:InclusiveGateway": "INCLUSIVE_GATEWAY",
  "bpmn:Participant": "POOL",
  "bpmn:Lane": "LANE",
  "bpmn:SequenceFlow": "SEQUENCE_FLOW",
  "bpmn:MessageFlow": "MESSAGE_FLOW",
  "bpmn:SubProcess": "SUBPROCESS",
};

export const mapBpmnJsType = (type: string): BpmnElementType | null => {
  return BPMN_TYPE_MAP[type] ?? null;
};

export type ParsedBpmnElement = {
  elementBpmnId: string;
  elementType: BpmnElementType;
  elementName: string | null;
};

/** BPMN XML에서 요소 id/type/name 추출 */
export const parseBpmnElementsFromXml = (xml: string | null): ParsedBpmnElement[] => {
  if (!xml?.trim()) {
    return [];
  }

  const results: ParsedBpmnElement[] = [];
  const tagPattern =
    /<bpmn:(\w+)\s[^>]*\bid="([^"]+)"(?:[^>]*\bname="([^"]*)")?[^>]*\/?>/g;

  let match: RegExpExecArray | null;
  while ((match = tagPattern.exec(xml)) !== null) {
    const tag = match[1];
    const bpmnType = `bpmn:${tag}`;
    const mapped = mapBpmnJsType(bpmnType);
    if (!mapped) {
      continue;
    }

    results.push({
      elementBpmnId: match[2],
      elementType: mapped,
      elementName: match[3] ?? null,
    });
  }

  return results;
};

/** 두 BPMN XML diff 계산 */
export const diffBpmnXml = (
  leftXml: string | null,
  rightXml: string | null,
): BpmnElementDiff[] => {
  const leftMap = new Map(
    parseBpmnElementsFromXml(leftXml).map((el) => [el.elementBpmnId, el]),
  );
  const rightMap = new Map(
    parseBpmnElementsFromXml(rightXml).map((el) => [el.elementBpmnId, el]),
  );

  const diff: BpmnElementDiff[] = [];
  const allIds = new Set([...leftMap.keys(), ...rightMap.keys()]);

  for (const id of allIds) {
    const left = leftMap.get(id);
    const right = rightMap.get(id);

    if (left && !right) {
      diff.push({
        elementBpmnId: id,
        elementType: left.elementType,
        elementName: left.elementName,
        changeType: "removed" satisfies BpmnDiffChangeType,
      });
      continue;
    }

    if (!left && right) {
      diff.push({
        elementBpmnId: id,
        elementType: right.elementType,
        elementName: right.elementName,
        changeType: "added" satisfies BpmnDiffChangeType,
      });
      continue;
    }

    if (left && right) {
      if (left.elementType !== right.elementType) {
        diff.push({
          elementBpmnId: id,
          elementType: right.elementType,
          elementName: right.elementName,
          changeType: "modified",
          field: "elementType",
          oldValue: left.elementType,
          newValue: right.elementType,
        });
      }

      if ((left.elementName ?? "") !== (right.elementName ?? "")) {
        diff.push({
          elementBpmnId: id,
          elementType: right.elementType,
          elementName: right.elementName,
          changeType: "modified",
          field: "elementName",
          oldValue: left.elementName,
          newValue: right.elementName,
        });
      }
    }
  }

  return diff;
};

/** 빈 BPMN 다이어그램 기본 XML */
export const EMPTY_BPMN_XML = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
  id="Definitions_1"
  targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_1" isExecutable="false" />
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1" />
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;

