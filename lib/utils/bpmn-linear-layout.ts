import type { BpmnElementLinkDto } from "@/types/bpmn";

/** 선형 BPMN Task 입력 */
export type LinearBpmnTaskInput = {
  bpmnElementId: string;
  name: string;
  linkedNodeId: number;
};

export type LinearBpmnBuildResult = {
  xml: string;
  elements: BpmnElementLinkDto[];
};

const PROCESS_ID = "Process_1";
const START_ID = "StartEvent_1";
const END_ID = "EndEvent_1";

const EVENT_SIZE = 36;
const TASK_WIDTH = 140;
const TASK_HEIGHT = 80;
const H_GAP = 80;
const V_GAP = 100;
const ORIGIN_X = 120;
const ORIGIN_Y = 120;
const TASKS_PER_ROW = 8;

/** XML 특수문자 이스케이프 */
const escapeXml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

type LayoutNode = {
  id: string;
  kind: "start" | "task" | "end";
  name?: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

/** 노드 좌표를 계산한다 — 행 단위 좌→우 배치 */
const buildLayoutNodes = (tasks: LinearBpmnTaskInput[]): LayoutNode[] => {
  const nodes: LayoutNode[] = [
    {
      id: START_ID,
      kind: "start",
      x: ORIGIN_X,
      y: ORIGIN_Y,
      width: EVENT_SIZE,
      height: EVENT_SIZE,
    },
  ];

  tasks.forEach((task, index) => {
    const row = Math.floor(index / TASKS_PER_ROW);
    const col = index % TASKS_PER_ROW;
    nodes.push({
      id: task.bpmnElementId,
      kind: "task",
      name: task.name,
      x: ORIGIN_X + col * (TASK_WIDTH + H_GAP),
      y: ORIGIN_Y + row * (TASK_HEIGHT + V_GAP),
      width: TASK_WIDTH,
      height: TASK_HEIGHT,
    });
  });

  const lastTask = nodes[nodes.length - 1];
  const endRow = Math.floor(tasks.length / TASKS_PER_ROW);
  const endCol = tasks.length % TASKS_PER_ROW;
  nodes.push({
    id: END_ID,
    kind: "end",
    x: lastTask
      ? lastTask.x + TASK_WIDTH + H_GAP
      : ORIGIN_X + TASK_WIDTH + H_GAP,
    y: ORIGIN_Y + endRow * (TASK_HEIGHT + V_GAP),
    width: EVENT_SIZE,
    height: EVENT_SIZE,
  });

  return nodes;
};

/** sequence flow ID 목록을 생성한다 */
const buildFlowIds = (tasks: LinearBpmnTaskInput[]): string[] => {
  const ids: string[] = [`Flow_${START_ID}_${tasks[0]?.bpmnElementId ?? END_ID}`];
  for (let i = 0; i < tasks.length - 1; i++) {
    ids.push(`Flow_${tasks[i].bpmnElementId}_${tasks[i + 1].bpmnElementId}`);
  }
  if (tasks.length > 0) {
    ids.push(`Flow_${tasks[tasks.length - 1].bpmnElementId}_${END_ID}`);
  }
  return ids;
};

/** L4 Task를 순서대로 연결한 선형 BPMN XML을 생성한다 */
export const buildLinearBpmnXml = (
  tasks: LinearBpmnTaskInput[],
): LinearBpmnBuildResult => {
  if (tasks.length === 0) {
    throw new Error("BPMN linear layout requires at least one task");
  }

  const layoutNodes = buildLayoutNodes(tasks);
  const flowIds = buildFlowIds(tasks);

  const processParts: string[] = [];
  processParts.push(
    `  <bpmn:startEvent id="${START_ID}" name="시작" />`,
  );

  for (const task of tasks) {
    processParts.push(
      `  <bpmn:userTask id="${task.bpmnElementId}" name="${escapeXml(task.name)}" />`,
    );
  }

  processParts.push(`  <bpmn:endEvent id="${END_ID}" name="종료" />`);

  const flowRefs: Array<{ id: string; source: string; target: string }> = [
    {
      id: flowIds[0],
      source: START_ID,
      target: tasks[0].bpmnElementId,
    },
  ];

  for (let i = 0; i < tasks.length - 1; i++) {
    flowRefs.push({
      id: flowIds[i + 1],
      source: tasks[i].bpmnElementId,
      target: tasks[i + 1].bpmnElementId,
    });
  }

  flowRefs.push({
    id: flowIds[flowIds.length - 1],
    source: tasks[tasks.length - 1].bpmnElementId,
    target: END_ID,
  });

  for (const flow of flowRefs) {
    processParts.push(
      `  <bpmn:sequenceFlow id="${flow.id}" sourceRef="${flow.source}" targetRef="${flow.target}" />`,
    );
  }

  const shapeParts: string[] = [];
  const edgeParts: string[] = [];

  for (const node of layoutNodes) {
    shapeParts.push(
      `      <bpmndi:BPMNShape id="${node.id}_di" bpmnElement="${node.id}">`,
      `        <dc:Bounds x="${node.x}" y="${node.y}" width="${node.width}" height="${node.height}" />`,
      `      </bpmndi:BPMNShape>`,
    );
  }

  const nodeById = new Map(layoutNodes.map((node) => [node.id, node]));

  for (const flow of flowRefs) {
    const source = nodeById.get(flow.source);
    const target = nodeById.get(flow.target);
    if (!source || !target) {
      continue;
    }

    const sourceX = source.x + source.width;
    const sourceY = source.y + source.height / 2;
    const targetX = target.x;
    const targetY = target.y + target.height / 2;

    edgeParts.push(
      `      <bpmndi:BPMNEdge id="${flow.id}_di" bpmnElement="${flow.id}">`,
      `        <di:waypoint x="${sourceX}" y="${sourceY}" />`,
      `        <di:waypoint x="${targetX}" y="${targetY}" />`,
      `      </bpmndi:BPMNEdge>`,
    );
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
  id="Definitions_1"
  targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="${PROCESS_ID}" isExecutable="false">
${processParts.join("\n")}
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="${PROCESS_ID}">
${shapeParts.join("\n")}
${edgeParts.join("\n")}
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;

  const elements: BpmnElementLinkDto[] = tasks.map((task) => ({
    elementBpmnId: task.bpmnElementId,
    elementType: "USER_TASK",
    elementName: task.name,
    linkedNodeId: task.linkedNodeId,
    properties: { linkKind: "L4_TASK" },
  }));

  return { xml, elements };
};
