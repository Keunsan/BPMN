import type { BpmnElementDto, BpmnElementType } from "@/types/bpmn";
import { isBpmnCallActivityType } from "@/lib/utils/bpmn-link";

export type E2eFlowStepKind =
  | "start"
  | "end"
  | "gateway"
  | "l3_call"
  | "unlinked_call"
  | "other";

export type E2eFlowStep = {
  stepNo: number;
  elementBpmnId: string;
  kind: E2eFlowStepKind;
  label: string;
  gatewayType?: BpmnElementType;
  linkedNodeId?: number;
  linkedProcessCode?: string | null;
  linkedProcessName?: string | null;
};

export type E2eFlowParticipant = {
  stepNo: number;
  elementBpmnId: string;
  linkedNodeId: number;
  linkedProcessCode: string | null;
  linkedProcessName: string | null;
};

type SequenceFlow = {
  sourceId: string;
  targetId: string;
};

const FLOW_LAYOUT_TYPES = new Set<BpmnElementType>([
  "START_EVENT",
  "END_EVENT",
  "INTERMEDIATE_EVENT",
  "CALL_ACTIVITY",
  "USER_TASK",
  "SERVICE_TASK",
  "MANUAL_TASK",
  "SCRIPT_TASK",
  "EXCLUSIVE_GATEWAY",
  "PARALLEL_GATEWAY",
  "INCLUSIVE_GATEWAY",
  "SUBPROCESS",
]);

const parseSequenceFlows = (xml: string): SequenceFlow[] => {
  const flows: SequenceFlow[] = [];
  const pattern =
    /<bpmn:sequenceFlow\s[^>]*\bid="[^"]+"[^>]*\bsourceRef="([^"]+)"[^>]*\btargetRef="([^"]+)"[^>]*\/?>/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(xml)) !== null) {
    flows.push({ sourceId: match[1], targetId: match[2] });
  }
  return flows;
};

const resolveStepKind = (
  element: BpmnElementDto,
): Pick<E2eFlowStep, "kind" | "gatewayType"> => {
  if (element.elementType === "START_EVENT") {
    return { kind: "start" };
  }
  if (element.elementType === "END_EVENT") {
    return { kind: "end" };
  }
  if (
    element.elementType === "EXCLUSIVE_GATEWAY" ||
    element.elementType === "PARALLEL_GATEWAY" ||
    element.elementType === "INCLUSIVE_GATEWAY"
  ) {
    return { kind: "gateway", gatewayType: element.elementType };
  }
  if (isBpmnCallActivityType(element.elementType)) {
    return element.linkedNodeId != null
      ? { kind: "l3_call" }
      : { kind: "unlinked_call" };
  }
  return { kind: "other" };
};

const resolveStepLabel = (element: BpmnElementDto): string => {
  if (element.elementName?.trim()) {
    return element.elementName.trim();
  }
  if (element.linkedProcessCode && element.linkedProcessName) {
    return `${element.linkedProcessCode} · ${element.linkedProcessName}`;
  }
  if (element.linkedProcessName?.trim()) {
    return element.linkedProcessName.trim();
  }
  return element.elementBpmnId;
};

const topologicalSortFlowElements = (
  elements: BpmnElementDto[],
  flows: SequenceFlow[],
): BpmnElementDto[] => {
  const flowElements = elements.filter((el) =>
    FLOW_LAYOUT_TYPES.has(el.elementType),
  );
  const idSet = new Set(flowElements.map((el) => el.elementBpmnId));
  const incoming = new Map<string, number>();
  const adj = new Map<string, string[]>();

  for (const id of idSet) {
    incoming.set(id, 0);
    adj.set(id, []);
  }

  for (const flow of flows) {
    if (!idSet.has(flow.sourceId) || !idSet.has(flow.targetId)) {
      continue;
    }
    adj.get(flow.sourceId)!.push(flow.targetId);
    incoming.set(flow.targetId, (incoming.get(flow.targetId) ?? 0) + 1);
  }

  const queue = [...idSet].filter((id) => (incoming.get(id) ?? 0) === 0);
  const sorted: BpmnElementDto[] = [];
  const byId = new Map(flowElements.map((el) => [el.elementBpmnId, el]));

  while (queue.length > 0) {
    const id = queue.shift()!;
    const el = byId.get(id);
    if (el) {
      sorted.push(el);
    }
    for (const next of adj.get(id) ?? []) {
      const count = (incoming.get(next) ?? 1) - 1;
      incoming.set(next, count);
      if (count === 0) {
        queue.push(next);
      }
    }
  }

  for (const el of flowElements) {
    if (!sorted.some((item) => item.elementBpmnId === el.elementBpmnId)) {
      sorted.push(el);
    }
  }

  return sorted;
};

/** E2E BPMN에서 실행 순서 단계와 참여 L3 목록을 추출한다 */
export const buildE2eFlowSteps = (input: {
  bpmnXml: string | null;
  elements: BpmnElementDto[];
}): { steps: E2eFlowStep[]; participants: E2eFlowParticipant[] } => {
  if (!input.bpmnXml?.trim() || input.elements.length === 0) {
    return { steps: [], participants: [] };
  }

  const flows = parseSequenceFlows(input.bpmnXml);
  const ordered = topologicalSortFlowElements(input.elements, flows);

  const steps: E2eFlowStep[] = [];
  const participants: E2eFlowParticipant[] = [];

  ordered.forEach((element, index) => {
    const { kind, gatewayType } = resolveStepKind(element);
    const stepNo = index + 1;

    steps.push({
      stepNo,
      elementBpmnId: element.elementBpmnId,
      kind,
      gatewayType,
      label: resolveStepLabel(element),
      linkedNodeId: element.linkedNodeId ?? undefined,
      linkedProcessCode: element.linkedProcessCode ?? null,
      linkedProcessName: element.linkedProcessName ?? null,
    });

    if (kind === "l3_call" && element.linkedNodeId != null) {
      participants.push({
        stepNo,
        elementBpmnId: element.elementBpmnId,
        linkedNodeId: element.linkedNodeId,
        linkedProcessCode: element.linkedProcessCode ?? null,
        linkedProcessName: element.linkedProcessName ?? null,
      });
    }
  });

  return { steps, participants };
};
