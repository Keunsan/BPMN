"use client";

import { useEffect, useRef, type RefObject } from "react";

import { EMPTY_BPMN_XML, mapBpmnJsType } from "@/lib/utils/bpmn-xml";
import type { BpmnElementLinkDto, BpmnElementType } from "@/types/bpmn";

import type { ProcessLinkInfo } from "./ProcessLinkModal";

import "bpmn-js/dist/assets/diagram-js.css";
import "bpmn-js/dist/assets/bpmn-js.css";
import "bpmn-js/dist/assets/bpmn-font/css/bpmn.css";
import "@bpmn-io/properties-panel/dist/assets/properties-panel.css";
import "diagram-js-minimap/assets/diagram-js-minimap.css";
import "./bpmn-editor.css";

type CanvasViewbox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type DiagramCanvas = {
  zoom: (mode: string) => void;
  viewbox: (box?: CanvasViewbox) => CanvasViewbox;
  getContainer: () => HTMLElement;
};

type DiagramMinimap = {
  open: () => void;
  toggle: () => void;
};

export type BpmnEditorSaveResult = {
  xml: string;
  svg: string;
  elements: BpmnElementLinkDto[];
};

export type BpmnEditorHandle = {
  save: () => Promise<BpmnEditorSaveResult>;
  undo: () => void;
  redo: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  fitViewport: () => void;
  revealElementLeftOfOverlay: (elementId: string, overlayLeft: number) => void;
  getSelectedElementId: () => string | null;
  getSelectedElementName: () => string | null;
  toggleMinimap: () => void;
  dismissInteraction: () => void;
  updateElementName: (elementId: string, name: string) => void;
};

type BpmnEditorInnerProps = {
  modelId: number;
  xml: string | null;
  links: Record<string, ProcessLinkInfo>;
  interactionLocked?: boolean;
  onSelectionChange?: (
    elementId: string | null,
    elementName?: string | null,
    elementType?: BpmnElementType | null,
  ) => void;
  onTaskHoverChange?: (hover: {
    elementId: string;
    elementName: string | null;
    x: number;
    y: number;
  } | null) => void;
  onReady?: (api: BpmnEditorHandle) => void;
};

/** bpmn-js 모델러 본체 */
export const BpmnEditorInner = ({
  modelId,
  xml,
  links,
  interactionLocked = false,
  onSelectionChange,
  onTaskHoverChange,
  onReady,
}: BpmnEditorInnerProps) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const propertiesRef = useRef<HTMLDivElement>(null);
  const modelerRef = useRef<import("bpmn-js/lib/Modeler").default | null>(null);
  const linksRef = useRef(links);

  useEffect(() => {
    linksRef.current = links;
  }, [links]);

  useEffect(() => {
    if (!canvasRef.current || !propertiesRef.current) {
      return;
    }

    let destroyed = false;

    const init = async () => {
      const BpmnModeler = (await import("bpmn-js/lib/Modeler")).default;
      const {
        BpmnPropertiesPanelModule,
        BpmnPropertiesProviderModule,
      } = await import("bpmn-js-properties-panel");
      const { default: minimapModule } = await import("diagram-js-minimap");

      if (destroyed || !canvasRef.current || !propertiesRef.current) {
        return;
      }

      const modeler = new BpmnModeler({
        container: canvasRef.current,
        propertiesPanel: {
          parent: propertiesRef.current,
        },
        additionalModules: [
          BpmnPropertiesPanelModule,
          BpmnPropertiesProviderModule,
          minimapModule,
        ],
        keyboard: {
          bindTo: document,
        },
      });

      modelerRef.current = modeler;

      const initialXml = xml?.trim() ? xml : EMPTY_BPMN_XML;
      try {
        await modeler.importXML(initialXml);
        restoreCanvasView(modeler, modelId, initialXml);
        openMinimap(modeler);
        refreshLinkOverlays(modeler, linksRef.current);
      } catch (err) {
        console.error("[BpmnEditor] import failed:", err);
      }

      const eventBus = modeler.get("eventBus") as {
        on: (
          event: string,
          callback: (e: {
            element?: {
              id: string;
              type: string;
              businessObject?: { name?: string; $type?: string };
            };
            newSelection?: Array<{
              id: string;
              type: string;
              businessObject?: { name?: string; $type?: string };
            }>;
            originalEvent?: MouseEvent;
          }) => void,
        ) => void;
      };

      eventBus.on("selection.changed", (e) => {
        const selected = e.newSelection?.[0];
        if (!selected || !isLinkableType(selected.type)) {
          onSelectionChange?.(null, null);
          return;
        }
        onSelectionChange?.(
          selected.id,
          selected.businessObject?.name ?? null,
          mapBpmnJsType(selected.businessObject?.$type ?? selected.type),
        );
      });

      eventBus.on("element.hover", (e) => {
        const element = e.element;
        if (!element || !isLinkableType(element.type)) {
          onTaskHoverChange?.(null);
          return;
        }

        onTaskHoverChange?.({
          elementId: element.id,
          elementName: element.businessObject?.name ?? null,
          x: e.originalEvent?.clientX ?? 0,
          y: e.originalEvent?.clientY ?? 0,
        });
      });

      eventBus.on("element.out", (e) => {
        if (e.element && isLinkableType(e.element.type)) {
          onTaskHoverChange?.(null);
        }
      });

      onReady?.(createEditorApi(modeler, linksRef, modelId));
    };

    void init();

    return () => {
      destroyed = true;
      if (modelerRef.current) {
        persistCanvasView(modelId, modelerRef.current);
      }
      modelerRef.current?.destroy();
      modelerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- modelId 변경 시에만 재초기화 (저장 후 xml 갱신은 무시)
  }, [modelId]);

  useEffect(() => {
    if (modelerRef.current) {
      refreshLinkOverlays(modelerRef.current, links);
    }
  }, [links]);

  useEffect(() => {
    if (interactionLocked && modelerRef.current) {
      dismissDiagramInteraction(modelerRef.current);
    }
  }, [interactionLocked]);

  return (
    <div
      className="pams-bpmn-root"
      data-interaction-locked={interactionLocked ? "true" : undefined}
    >
      <div ref={canvasRef} className="pams-bpmn-canvas" />
      <div ref={propertiesRef} className="pams-bpmn-properties" />
    </div>
  );
};

const viewboxStorageKey = (modelId: number): string =>
  `pams-bpmn-viewbox:${modelId}`;

const hasSavedDiagramLayout = (xml: string): boolean =>
  xml.includes("bpmndi:BPMNShape") && xml.includes("dc:Bounds");

/** 저장된 뷰포트 또는 요소 bounds 기준으로 화면 위치를 복원한다 */
const restoreCanvasView = (
  modeler: import("bpmn-js/lib/Modeler").default,
  modelId: number,
  xml: string,
): void => {
  const canvas = modeler.get("canvas") as DiagramCanvas;
  const stored = sessionStorage.getItem(viewboxStorageKey(modelId));

  if (stored) {
    try {
      canvas.viewbox(JSON.parse(stored) as CanvasViewbox);
      return;
    } catch {
      sessionStorage.removeItem(viewboxStorageKey(modelId));
    }
  }

  if (hasSavedDiagramLayout(xml)) {
    applyElementBoundsViewbox(modeler);
    return;
  }

  canvas.zoom("fit-viewport");
};

/** 다이어그램 요소 bounds로 뷰포트를 맞춘다 (fit-viewport 대신 좌표 유지) */
const applyElementBoundsViewbox = (
  modeler: import("bpmn-js/lib/Modeler").default,
): void => {
  const elementRegistry = modeler.get("elementRegistry") as {
    forEach: (
      callback: (element: {
        x?: number;
        y?: number;
        width?: number;
        height?: number;
      }) => void,
    ) => void;
  };
  const canvas = modeler.get("canvas") as DiagramCanvas;

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  elementRegistry.forEach((element) => {
    if (
      element.x === undefined ||
      element.y === undefined ||
      element.width === undefined ||
      element.height === undefined
    ) {
      return;
    }

    minX = Math.min(minX, element.x);
    minY = Math.min(minY, element.y);
    maxX = Math.max(maxX, element.x + element.width);
    maxY = Math.max(maxY, element.y + element.height);
  });

  if (!Number.isFinite(minX)) {
    canvas.zoom("fit-viewport");
    return;
  }

  const padding = 80;
  canvas.viewbox({
    x: minX - padding,
    y: minY - padding,
    width: maxX - minX + padding * 2,
    height: maxY - minY + padding * 2,
  });
};

const persistCanvasView = (
  modelId: number,
  modeler: import("bpmn-js/lib/Modeler").default,
): void => {
  const canvas = modeler.get("canvas") as DiagramCanvas;
  sessionStorage.setItem(
    viewboxStorageKey(modelId),
    JSON.stringify(canvas.viewbox()),
  );
};

const createEditorApi = (
  modeler: import("bpmn-js/lib/Modeler").default,
  linksRef: RefObject<Record<string, ProcessLinkInfo>>,
  modelId: number,
): BpmnEditorHandle => ({
  save: async () => {
    const { xml: savedXml } = await modeler.saveXML({ format: true });
    const { svg } = await modeler.saveSVG();
    persistCanvasView(modelId, modeler);

    if (
      process.env.NODE_ENV === "development" &&
      savedXml &&
      !hasSavedDiagramLayout(savedXml)
    ) {
      console.warn(
        "[BpmnEditor] 저장 XML에 좌표 정보(bpmndi)가 없습니다. Task 위치가 초기화될 수 있습니다.",
      );
    }

    return {
      xml: savedXml ?? "",
      svg: svg ?? "",
      elements: extractElements(modeler, linksRef.current),
    };
  },
  undo: () => {
    (modeler.get("commandStack") as { undo: () => void }).undo();
  },
  redo: () => {
    (modeler.get("commandStack") as { redo: () => void }).redo();
  },
  zoomIn: () => {
    (modeler.get("zoomScroll") as { stepZoom: (d: number) => void }).stepZoom(1);
  },
  zoomOut: () => {
    (modeler.get("zoomScroll") as { stepZoom: (d: number) => void }).stepZoom(-1);
  },
  fitViewport: () => {
    (modeler.get("canvas") as DiagramCanvas).zoom("fit-viewport");
  },
  revealElementLeftOfOverlay: (elementId, overlayLeft) => {
    revealElementLeftOfOverlay(modeler, elementId, overlayLeft);
  },
  getSelectedElementId: () => {
    const selected = (
      modeler.get("selection") as { get: () => Array<{ id: string; type: string }> }
    ).get()[0];
    if (!selected || !isLinkableType(selected.type)) {
      return null;
    }
    return selected.id;
  },
  getSelectedElementName: () => {
    const selected = (
      modeler.get("selection") as {
        get: () => Array<{ businessObject?: { name?: string }; type: string }>;
      }
    ).get()[0];
    return selected?.businessObject?.name ?? null;
  },
  toggleMinimap: () => {
    (modeler.get("minimap") as DiagramMinimap).toggle();
  },
  dismissInteraction: () => {
    dismissDiagramInteraction(modeler);
  },
  updateElementName: (elementId, name) => {
    updateElementName(modeler, elementId, name);
  },
});

/** 우측 Sheet 또는 화면 경계가 선택 요소를 가리면 보이는 영역 안으로 뷰포트를 이동한다. */
const revealElementLeftOfOverlay = (
  modeler: import("bpmn-js/lib/Modeler").default,
  elementId: string,
  overlayLeft: number,
): void => {
  const canvas = modeler.get("canvas") as DiagramCanvas;
  const containerRect = canvas.getContainer().getBoundingClientRect();

  const elementRegistry = modeler.get("elementRegistry") as {
    get: (
      id: string,
    ) =>
      | { x?: number; y?: number; width?: number; height?: number }
      | undefined;
  };
  const element = elementRegistry.get(elementId);

  if (
    !element ||
    element.x === undefined ||
    element.y === undefined ||
    element.width === undefined ||
    element.height === undefined ||
    containerRect.width <= 0 ||
    containerRect.height <= 0
  ) {
    return;
  }

  const viewbox = canvas.viewbox();
  const scaleX = containerRect.width / viewbox.width;
  const scaleY = containerRect.height / viewbox.height;
  const elementWidth = element.width * scaleX;
  const elementHeight = element.height * scaleY;
  const margin = overlayLeft - containerRect.left >= elementWidth + 16 ? 16 : 0;
  const availableRight = overlayLeft - margin;
  const verticalMargin = containerRect.height >= elementHeight + 32 ? 16 : 0;
  const availableTop = containerRect.top + verticalMargin;
  const availableBottom = containerRect.bottom - verticalMargin;
  let nextX = viewbox.x;
  let nextY = viewbox.y;

  if (availableRight > containerRect.left) {
    const elementRight =
      containerRect.left + (element.x + element.width - viewbox.x) * scaleX;

    if (elementRight > availableRight) {
      nextX += (elementRight - availableRight) / scaleX;
    }
  }

  const elementTop = containerRect.top + (element.y - viewbox.y) * scaleY;
  const elementBottom =
    containerRect.top + (element.y + element.height - viewbox.y) * scaleY;

  if (elementTop < availableTop) {
    nextY -= (availableTop - elementTop) / scaleY;
  } else if (elementBottom > availableBottom) {
    nextY += (elementBottom - availableBottom) / scaleY;
  }

  if (nextX === viewbox.x && nextY === viewbox.y) {
    return;
  }

  canvas.viewbox({
    x: nextX,
    y: nextY,
    width: viewbox.width,
    height: viewbox.height,
  });
};

/** BPMN 요소 이름을 갱신해 다이어그램·속성 패널에 반영한다 */
const updateElementName = (
  modeler: import("bpmn-js/lib/Modeler").default,
  elementId: string,
  name: string,
): void => {
  const elementRegistry = modeler.get("elementRegistry") as {
    get: (id: string) => { id: string } | undefined;
  };
  const modeling = modeler.get("modeling") as {
    updateProperties: (element: object, props: { name: string }) => void;
  };

  const element = elementRegistry.get(elementId);
  if (!element) {
    return;
  }

  modeling.updateProperties(element, { name });
};

/** 컨텍스트 패드·팝업 메뉴 등 다이어그램 부가 UI를 닫는다 (요소 선택은 유지) */
const dismissDiagramInteraction = (
  modeler: import("bpmn-js/lib/Modeler").default,
): void => {
  const closableServices = ["contextPad", "popupMenu"] as const;

  for (const service of closableServices) {
    try {
      (modeler.get(service) as { close?: () => void }).close?.();
    } catch {
      // 서비스 미존재
    }
  }
};

/** 화면 밖 Task 존재를 쉽게 파악할 수 있도록 미니맵을 기본 표시한다. */
const openMinimap = (modeler: import("bpmn-js/lib/Modeler").default): void => {
  try {
    (modeler.get("minimap") as DiagramMinimap).open();
  } catch {
    // minimap 모듈이 로드되지 않은 경우 편집 동작은 유지한다.
  }
};

const isLinkableType = (type: string): boolean =>
  type.includes("Task") || type.includes("SubProcess");

const refreshLinkOverlays = (
  modeler: import("bpmn-js/lib/Modeler").default,
  links: Record<string, ProcessLinkInfo>,
) => {
  const overlays = modeler.get("overlays") as {
    clear: () => void;
    add: (
      elementId: string,
      overlayId: string,
      options: { position: { bottom: number; right: number }; html: string },
    ) => void;
  };

  overlays.clear();

  for (const [elementId, link] of Object.entries(links)) {
    if (!link) {
      continue;
    }

    try {
      overlays.add(elementId, "pams-link", {
        position: { bottom: 14, right: 0 },
        html: `<div class="pams-bpmn-link-badge" title="${escapeHtml(link.name)}">${escapeHtml(link.code)}</div>`,
      });
    } catch {
      // 요소 미존재
    }
  }
};

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const extractElements = (
  modeler: import("bpmn-js/lib/Modeler").default,
  links: Record<string, ProcessLinkInfo>,
): BpmnElementLinkDto[] => {
  const elementRegistry = modeler.get("elementRegistry") as {
    forEach: (
      callback: (element: {
        id: string;
        type: string;
        businessObject?: { id?: string; name?: string; $type?: string };
      }) => void,
    ) => void;
  };

  const results: BpmnElementLinkDto[] = [];

  elementRegistry.forEach((element) => {
    const bpmnType = element.businessObject?.$type ?? element.type;
    const mapped = mapBpmnJsType(bpmnType);
    if (!mapped) {
      return;
    }

    const elementBpmnId = element.businessObject?.id ?? element.id;
    const link = links[element.id] ?? links[elementBpmnId];
    results.push({
      elementBpmnId,
      elementType: mapped,
      elementName: element.businessObject?.name ?? null,
      linkedNodeId: link?.nodeId ?? null,
    });
  });

  return results;
};
