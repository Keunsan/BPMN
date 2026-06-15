/**
 * Call Activity drill-down — BpmnEditor/BpmnViewer의 element.dblclick과
 * BpmnDrilldownViewer가 L4 slice를 setRootElement(재 import) + breadcrumb로 표시합니다.
 */
export const PAMS_DRILLDOWN_EVENT = "element.dblclick";

export type DrilldownViewerLink = {
  nodeId: number;
  code: string;
  name: string;
  linkKind: string;
};

export type DrilldownStackFrame = {
  key: string;
  label: string;
  xml: string;
  links: Record<string, DrilldownViewerLink>;
};

export type L3CallTarget = {
  nodeId: number;
  code: string;
  name: string;
};

/** Call Activity dblclick 시 L3_CALL 연결만 drill-down 대상 */
export const isDrilldownCallActivity = (
  link: DrilldownViewerLink | undefined,
): link is DrilldownViewerLink =>
  Boolean(link && link.linkKind === "L3_CALL");

/** breadcrumb 라벨 — 상위 > L3 코드 · 명칭 */
export const formatDrilldownFrameLabel = (
  parentLabel: string | undefined,
  code: string,
  name: string,
): string =>
  `${parentLabel ? `${parentLabel} > ` : ""}${code} · ${name}`;
