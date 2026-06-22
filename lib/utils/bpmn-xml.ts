import type { BpmnDiffChangeType, BpmnElementDiff, BpmnElementType } from "@/types/bpmn";

/** bpmn-js 타입 → DB element_type 매핑 */
const BPMN_TYPE_MAP: Record<string, BpmnElementType> = {
  "bpmn:StartEvent": "START_EVENT",
  "bpmn:EndEvent": "END_EVENT",
  "bpmn:IntermediateThrowEvent": "INTERMEDIATE_EVENT",
  "bpmn:IntermediateCatchEvent": "INTERMEDIATE_EVENT",
  "bpmn:Task": "USER_TASK",
  "bpmn:UserTask": "USER_TASK",
  "bpmn:ServiceTask": "SERVICE_TASK",
  "bpmn:ManualTask": "MANUAL_TASK",
  "bpmn:ScriptTask": "SCRIPT_TASK",
  "bpmn:SendTask": "SEND_TASK",
  "bpmn:ReceiveTask": "RECEIVE_TASK",
  "bpmn:ExclusiveGateway": "EXCLUSIVE_GATEWAY",
  "bpmn:ParallelGateway": "PARALLEL_GATEWAY",
  "bpmn:InclusiveGateway": "INCLUSIVE_GATEWAY",
  "bpmn:Participant": "POOL",
  "bpmn:Lane": "LANE",
  "bpmn:SequenceFlow": "SEQUENCE_FLOW",
  "bpmn:MessageFlow": "MESSAGE_FLOW",
  "bpmn:SubProcess": "SUBPROCESS",
  "bpmn:CallActivity": "CALL_ACTIVITY",
};

/** XML·moddle 표기 차이(task vs Task)를 흡수한다 */
const BPMN_TYPE_BY_LOCAL: Record<string, BpmnElementType> = {
  startevent: "START_EVENT",
  endevent: "END_EVENT",
  intermediatethrowevent: "INTERMEDIATE_EVENT",
  intermediatecatchevent: "INTERMEDIATE_EVENT",
  task: "USER_TASK",
  usertask: "USER_TASK",
  servicetask: "SERVICE_TASK",
  manualtask: "MANUAL_TASK",
  scripttask: "SCRIPT_TASK",
  sendtask: "SEND_TASK",
  receivetask: "RECEIVE_TASK",
  exclusivegateway: "EXCLUSIVE_GATEWAY",
  parallelgateway: "PARALLEL_GATEWAY",
  inclusivegateway: "INCLUSIVE_GATEWAY",
  participant: "POOL",
  lane: "LANE",
  sequenceflow: "SEQUENCE_FLOW",
  messageflow: "MESSAGE_FLOW",
  subprocess: "SUBPROCESS",
  callactivity: "CALL_ACTIVITY",
};

export const mapBpmnJsType = (type: string): BpmnElementType | null => {
  const direct = BPMN_TYPE_MAP[type];
  if (direct) {
    return direct;
  }

  const local = type.replace(/^bpmn:/i, "").toLowerCase();
  return BPMN_TYPE_BY_LOCAL[local] ?? null;
};

/** BPMN 2.0 태스크 유형 (팔레트·유형 전환 대상) */
export const BPMN_MORPHABLE_TASK_TYPES = [
  "USER_TASK",
  "SERVICE_TASK",
  "MANUAL_TASK",
  "SCRIPT_TASK",
  "SEND_TASK",
  "RECEIVE_TASK",
] as const satisfies readonly BpmnElementType[];

export type BpmnMorphableTaskType = (typeof BPMN_MORPHABLE_TASK_TYPES)[number];

const BPMN_ELEMENT_TYPE_TO_JS: Record<BpmnMorphableTaskType, string> = {
  USER_TASK: "bpmn:UserTask",
  SERVICE_TASK: "bpmn:ServiceTask",
  MANUAL_TASK: "bpmn:ManualTask",
  SCRIPT_TASK: "bpmn:ScriptTask",
  SEND_TASK: "bpmn:SendTask",
  RECEIVE_TASK: "bpmn:ReceiveTask",
};

/** DB element_type → bpmn-js moddle 타입 */
export const mapBpmnElementTypeToJs = (
  elementType: BpmnElementType,
): string | null =>
  BPMN_ELEMENT_TYPE_TO_JS[elementType as BpmnMorphableTaskType] ?? null;

/** 태스크 유형 전환·팔레트 생성 대상인지 판별한다 */
export const isBpmnMorphableTaskType = (
  type: BpmnElementType | null | undefined,
): type is BpmnMorphableTaskType =>
  type != null &&
  (BPMN_MORPHABLE_TASK_TYPES as readonly BpmnElementType[]).includes(type);

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

