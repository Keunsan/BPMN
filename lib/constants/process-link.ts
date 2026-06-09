import type { ProcessLinkInfo } from "@/components/bpmn/ProcessLinkModal";

/** BPMN 캔버스 드롭용 L4 프로세스 drag MIME */
export const PAMS_PROCESS_DRAG_MIME = "application/pams-process";

/** text/plain fallback — 브라우저별 custom MIME 호환 */
export const PAMS_PROCESS_DRAG_PLAIN = "text/pams-process-link";

let pendingProcessLinkDrag: ProcessLinkInfo | null = null;

/** 드래그 시작 시 payload를 등록한다 */
export const beginProcessLinkDrag = (link: ProcessLinkInfo): void => {
  pendingProcessLinkDrag = link;
};

/** 드래그 종료 시 pending payload를 비운다 */
export const endProcessLinkDrag = (): void => {
  pendingProcessLinkDrag = null;
};

/** L4 프로세스 drag payload 직렬화 */
export const serializeProcessLinkDrag = (link: ProcessLinkInfo): string =>
  JSON.stringify(link);

/** 드래그 중인 프로세스 연결 payload인지 확인한다 */
export const isProcessLinkDragEvent = (dataTransfer: DataTransfer | null): boolean => {
  if (!dataTransfer) {
    return false;
  }
  if (pendingProcessLinkDrag) {
    return true;
  }
  return (
    dataTransfer.types.includes(PAMS_PROCESS_DRAG_MIME) ||
    dataTransfer.types.includes(PAMS_PROCESS_DRAG_PLAIN) ||
    dataTransfer.types.includes("text/plain")
  );
};

/** drop 시 payload를 역직렬화한다 */
export const parseProcessLinkDrag = (
  dataTransfer: DataTransfer,
): ProcessLinkInfo | null => {
  const candidates = [
    dataTransfer.getData(PAMS_PROCESS_DRAG_MIME),
    dataTransfer.getData(PAMS_PROCESS_DRAG_PLAIN),
    dataTransfer.getData("text/plain"),
  ];

  for (const raw of candidates) {
    if (!raw) {
      continue;
    }
    try {
      const parsed = JSON.parse(raw) as ProcessLinkInfo;
      if (
        typeof parsed.nodeId === "number" &&
        typeof parsed.code === "string" &&
        typeof parsed.name === "string"
      ) {
        return parsed;
      }
    } catch {
      // 다음 후보 시도
    }
  }

  return pendingProcessLinkDrag;
};

/** drop 처리 후 pending payload를 정리한다 */
export const consumeProcessLinkDrag = (
  dataTransfer: DataTransfer,
): ProcessLinkInfo | null => {
  const link = parseProcessLinkDrag(dataTransfer);
  pendingProcessLinkDrag = null;
  return link;
};

/** DataTransfer에 drag payload를 기록한다 */
export const writeProcessLinkDrag = (
  dataTransfer: DataTransfer,
  link: ProcessLinkInfo,
): void => {
  const serialized = serializeProcessLinkDrag(link);
  beginProcessLinkDrag(link);
  dataTransfer.setData(PAMS_PROCESS_DRAG_MIME, serialized);
  dataTransfer.setData(PAMS_PROCESS_DRAG_PLAIN, serialized);
  dataTransfer.setData("text/plain", serialized);
  dataTransfer.effectAllowed = "copy";
};
