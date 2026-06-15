import type { BpmnElementLinkDto, BpmnElementType } from "@/types/bpmn";
import { isBpmnTaskElementType } from "@/lib/utils/bpmn-link";
import { buildLinearBpmnXml } from "@/lib/utils/bpmn-linear-layout";

export type L4SliceElement = {
  elementBpmnId: string;
  elementType: BpmnElementType;
  elementName: string | null;
  linkedNodeId: number;
  linkedProcessCode: string | null;
  linkedProcessName: string | null;
};

export type L4SliceFlow = {
  sourceId: string;
  targetId: string;
};

export type L4SliceResult = {
  xml: string;
  elements: BpmnElementLinkDto[];
  flows: L4SliceFlow[];
};

const parseSequenceFlows = (xml: string): L4SliceFlow[] => {
  const flows: L4SliceFlow[] = [];
  const pattern =
    /<bpmn:sequenceFlow\s[^>]*\bid="[^"]+"[^>]*\bsourceRef="([^"]+)"[^>]*\btargetRef="([^"]+)"[^>]*\/?>/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(xml)) !== null) {
    flows.push({ sourceId: match[1], targetId: match[2] });
  }
  return flows;
};

/** L3 BPMN에서 L4-linked Task slice를 추출하고 SubProcess용 XML을 생성한다 */
export const buildL4SliceFromL3Bpmn = (input: {
  bpmnXml: string | null;
  elements: Array<{
    elementBpmnId: string;
    elementType: BpmnElementType;
    elementName: string | null;
    linkedNodeId: number | null;
    linkedProcessCode?: string | null;
    linkedProcessName?: string | null;
    properties?: Record<string, unknown> | null;
  }>;
}): L4SliceResult | null => {
  if (!input.bpmnXml?.trim()) {
    return null;
  }

  const l4Elements = input.elements.filter(
    (el) =>
      el.linkedNodeId != null &&
      isBpmnTaskElementType(el.elementType) &&
      el.properties?.linkKind !== "L3_CALL",
  );

  if (l4Elements.length === 0) {
    return null;
  }

  const l4Ids = new Set(l4Elements.map((el) => el.elementBpmnId));
  const allFlows = parseSequenceFlows(input.bpmnXml);
  const flows = allFlows.filter(
    (flow) => l4Ids.has(flow.sourceId) && l4Ids.has(flow.targetId),
  );

  const ordered = topologicalSortL4(l4Elements, flows);

  const linearTasks = ordered.map((el) => ({
    bpmnElementId: el.elementBpmnId,
    name: el.elementName ?? el.linkedProcessName ?? el.elementBpmnId,
    linkedNodeId: el.linkedNodeId!,
  }));

  const built = buildLinearBpmnXml(linearTasks);

  return {
    xml: built.xml,
    elements: built.elements,
    flows,
  };
};

const topologicalSortL4 = (
  elements: Array<{
    elementBpmnId: string;
    elementType: BpmnElementType;
    elementName: string | null;
    linkedNodeId: number | null;
    linkedProcessCode?: string | null;
    linkedProcessName?: string | null;
  }>,
  flows: L4SliceFlow[],
): typeof elements => {
  const idSet = new Set(elements.map((el) => el.elementBpmnId));
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
  const sorted: typeof elements = [];
  const byId = new Map(elements.map((el) => [el.elementBpmnId, el]));

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

  for (const el of elements) {
    if (!sorted.some((item) => item.elementBpmnId === el.elementBpmnId)) {
      sorted.push(el);
    }
  }

  return sorted;
};
