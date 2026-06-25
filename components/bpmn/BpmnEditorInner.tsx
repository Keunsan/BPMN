"use client";

import { useEffect, useRef, type RefObject } from "react";

import { EMPTY_BPMN_XML, mapBpmnJsType } from "@/lib/utils/bpmn-xml";
import { toBpmnElementLinkProperties } from "@/lib/utils/bpmn-link";
import {
  consumeProcessLinkDrag,
  isProcessLinkDragEvent,
} from "@/lib/constants/process-link";
import type { BpmnElementLinkDto, BpmnElementType, ProcessLinkInfo } from "@/types/bpmn";

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

export type BpmnEditorDiagramSnapshot = {
  xml: string;
  elements: BpmnElementLinkDto[];
};

export type BpmnEditorHandle = {
  save: () => Promise<BpmnEditorSaveResult>;
  getDiagramSnapshot: () => Promise<BpmnEditorDiagramSnapshot | null>;
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
  onProcessLinkDrop?: (
    elementId: string,
    link: ProcessLinkInfo,
    elementType: BpmnElementType | null,
  ) => void;
  onCallActivityDblClick?: (link: ProcessLinkInfo) => void;
  /** shape.replace 시 element id가 바뀌면 프로세스 연결 키를 이전한다 */
  onElementReplaced?: (oldId: string, newId: string) => void;
  onReady?: (api: BpmnEditorHandle) => void;
  onDirtyChange?: (dirty: boolean) => void;
};

/** bpmn-js 모델러 본체 */
export const BpmnEditorInner = ({
  modelId,
  xml,
  links,
  interactionLocked = false,
  onSelectionChange,
  onTaskHoverChange,
  onProcessLinkDrop,
  onCallActivityDblClick,
  onElementReplaced,
  onReady,
  onDirtyChange,
}: BpmnEditorInnerProps) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const propertiesRef = useRef<HTMLDivElement>(null);
  const modelerRef = useRef<import("bpmn-js/lib/Modeler").default | null>(null);
  const linksRef = useRef(links);
  const onProcessLinkDropRef = useRef(onProcessLinkDrop);
  const onCallActivityDblClickRef = useRef(onCallActivityDblClick);
  const onElementReplacedRef = useRef(onElementReplaced);
  const onSelectionChangeRef = useRef(onSelectionChange);
  const onDirtyChangeRef = useRef(onDirtyChange);
  const dropHighlightRef = useRef<string | null>(null);

  useEffect(() => {
    onDirtyChangeRef.current = onDirtyChange;
  }, [onDirtyChange]);

  useEffect(() => {
    onProcessLinkDropRef.current = onProcessLinkDrop;
  }, [onProcessLinkDrop]);

  useEffect(() => {
    onCallActivityDblClickRef.current = onCallActivityDblClick;
  }, [onCallActivityDblClick]);

  useEffect(() => {
    onElementReplacedRef.current = onElementReplaced;
  }, [onElementReplaced]);

  useEffect(() => {
    onSelectionChangeRef.current = onSelectionChange;
  }, [onSelectionChange]);

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
      const { pamsPaletteModule } = await import("./pams-palette-provider");
      const { pamsContextPadModule } = await import("./pams-context-pad-provider");

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
          pamsPaletteModule,
          pamsContextPadModule,
        ],
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
          priorityOrCallback:
            | number
            | ((e: {
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
                context?: {
                  oldShape: {
                    id: string;
                    type: string;
                  };
                  newShape: {
                    id: string;
                    type: string;
                    businessObject?: { name?: string; $type?: string };
                  };
                };
                element?: {
                  id: string;
                  type: string;
                  businessObject?: { name?: string; $type?: string };
                };
                newElement?: {
                  id: string;
                  type: string;
                  businessObject?: { name?: string; $type?: string };
                };
              }) => void),
          callback?: (e: {
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
            context?: {
              oldShape: {
                id: string;
                type: string;
              };
              newShape: {
                id: string;
                type: string;
                businessObject?: { name?: string; $type?: string };
              };
            };
            element?: {
              id: string;
              type: string;
              businessObject?: { name?: string; $type?: string };
            };
            newElement?: {
              id: string;
              type: string;
              businessObject?: { name?: string; $type?: string };
            };
          }) => void,
        ) => void;
      };

      eventBus.on("selection.changed", (e) => {
        const selected = e.newSelection?.[0];
        if (!selected || !isLinkableType(selected.type)) {
          onSelectionChange?.(null, null, null);
          return;
        }
        onSelectionChange?.(
          selected.id,
          selected.businessObject?.name ?? null,
          mapBpmnJsType(selected.businessObject?.$type ?? selected.type),
        );
      });

      let overlayRefreshPending = false;
      const scheduleLinkOverlayRefresh = () => {
        if (overlayRefreshPending) {
          return;
        }
        overlayRefreshPending = true;
        queueMicrotask(() => {
          overlayRefreshPending = false;
          refreshLinkOverlays(modeler, linksRef.current);
        });
      };

      eventBus.on("element.changed", (e) => {
        const element = e.element;
        if (!element?.id || !isLinkableType(element.type)) {
          return;
        }

        if (linksRef.current[element.id] && !syncingLinkLayout) {
          scheduleLinkOverlayRefresh();
        }

        const selected = (
          modeler.get("selection") as {
            get: () => Array<{ id: string }>;
          }
        ).get()[0];

        if (!selected || selected.id !== element.id) {
          return;
        }

        onSelectionChange?.(
          element.id,
          element.businessObject?.name ?? null,
          mapBpmnJsType(element.businessObject?.$type ?? element.type),
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

      eventBus.on("element.dblclick", (e) => {
        const element = e.element;
        if (!element?.id) {
          return;
        }
        const mapped = mapBpmnJsType(
          element.businessObject?.$type ?? element.type,
        );
        if (mapped !== "CALL_ACTIVITY") {
          return;
        }
        const link = linksRef.current[element.id];
        if (link?.linkKind === "L3_CALL") {
          onCallActivityDblClickRef.current?.(link);
        }
      });

      eventBus.on("commandStack.changed", () => {
        const stack = modeler.get("commandStack") as { canUndo: () => boolean };
        onDirtyChangeRef.current?.(stack.canUndo());
      });
      onDirtyChangeRef.current?.(false);

      // replace.end는 shape.replace·id 복원(ReplaceElementBehaviour) 완료 후 발생한다
      eventBus.on("replace.end", (event) => {
        const oldShape = event.element;
        const newShape = event.newElement;
        if (!oldShape?.id || !newShape?.id) {
          return;
        }

        queueMicrotask(() => {
          syncAfterShapeReplace(
            modeler,
            oldShape,
            newShape,
            linksRef.current,
            onSelectionChangeRef.current,
            onElementReplacedRef.current,
          );
        });
      });

      const canvasContainer = (
        modeler.get("canvas") as DiagramCanvas
      ).getContainer();
      const dropTargets = Array.from(
        new Set(
          [canvasContainer, canvasRef.current].filter(
            (node): node is HTMLElement => node instanceof HTMLElement,
          ),
        ),
      );

      const handleDragEnterOrOver = (event: DragEvent) => {
        if (!isProcessLinkDragEvent(event.dataTransfer)) {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        if (event.dataTransfer) {
          event.dataTransfer.dropEffect = "copy";
        }
        const elementId = resolveLinkableElementAtPoint(
          modeler,
          event.clientX,
          event.clientY,
        );
        setDropHighlight(modeler, elementId, dropHighlightRef);
      };

      const handleDragLeave = (event: DragEvent) => {
        if (!isProcessLinkDragEvent(event.dataTransfer)) {
          return;
        }
        if (
          event.relatedTarget instanceof Node &&
          dropTargets.some((target) => target.contains(event.relatedTarget as Node))
        ) {
          return;
        }
        setDropHighlight(modeler, null, dropHighlightRef);
      };

      const handleDrop = (event: DragEvent) => {
        if (!isProcessLinkDragEvent(event.dataTransfer)) {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        const link = event.dataTransfer
          ? consumeProcessLinkDrag(event.dataTransfer)
          : null;
        const elementId = resolveLinkableElementAtPoint(
          modeler,
          event.clientX,
          event.clientY,
        );
        setDropHighlight(modeler, null, dropHighlightRef);
        if (link && elementId) {
          const elementRegistry = modeler.get("elementRegistry") as {
            get: (id: string) =>
              | {
                  businessObject?: { $type?: string };
                  type: string;
                }
              | undefined;
          };
          const dropped = elementRegistry.get(elementId);
          const mapped = dropped
            ? mapBpmnJsType(dropped.businessObject?.$type ?? dropped.type)
            : null;
          onProcessLinkDropRef.current?.(elementId, link, mapped);
        }
      };

      const listenerOptions: AddEventListenerOptions = { capture: true };

      for (const target of dropTargets) {
        target.addEventListener("dragenter", handleDragEnterOrOver, listenerOptions);
        target.addEventListener("dragover", handleDragEnterOrOver, listenerOptions);
        target.addEventListener("dragleave", handleDragLeave, listenerOptions);
        target.addEventListener("drop", handleDrop, listenerOptions);
      }

      onReady?.(createEditorApi(modeler, linksRef, modelId));

      return () => {
        for (const target of dropTargets) {
          target.removeEventListener("dragenter", handleDragEnterOrOver, listenerOptions);
          target.removeEventListener("dragover", handleDragEnterOrOver, listenerOptions);
          target.removeEventListener("dragleave", handleDragLeave, listenerOptions);
          target.removeEventListener("drop", handleDrop, listenerOptions);
        }
        setDropHighlight(modeler, null, dropHighlightRef);
      };
    };

    let cleanupDropHandlers: (() => void) | undefined;

    void init().then((cleanup) => {
      cleanupDropHandlers = cleanup;
    });

    return () => {
      destroyed = true;
      cleanupDropHandlers?.();
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
    if (!modelerRef.current) {
      return;
    }

    if (interactionLocked) {
      dismissDiagramInteraction(modelerRef.current);
      return;
    }

    restoreDiagramContextPad(modelerRef.current);
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

type DiagramBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

/** 다이어그램에 배치된 요소들의 전체 bounds를 계산한다 */
const getDiagramElementBounds = (
  modeler: import("bpmn-js/lib/Modeler").default,
): DiagramBounds | null => {
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
    return null;
  }

  return { minX, minY, maxX, maxY };
};

/** 다이어그램 요소 bounds로 뷰포트를 맞춘다 (fit-viewport 대신 좌표 유지) */
const applyElementBoundsViewbox = (
  modeler: import("bpmn-js/lib/Modeler").default,
): void => {
  const canvas = modeler.get("canvas") as DiagramCanvas;
  const bounds = getDiagramElementBounds(modeler);

  if (!bounds) {
    canvas.zoom("fit-viewport");
    return;
  }

  const padding = 80;
  canvas.viewbox({
    x: bounds.minX - padding,
    y: bounds.minY - padding,
    width: bounds.maxX - bounds.minX + padding * 2,
    height: bounds.maxY - bounds.minY + padding * 2,
  });
};

/** 좌측 BPMN palette가 차지하는 영역의 오른쪽 inset(px)을 반환한다 */
const getPaletteRightInset = (container: HTMLElement): number => {
  const palette = container.querySelector<HTMLElement>(".djs-palette");
  if (!palette) {
    return 0;
  }

  const containerRect = container.getBoundingClientRect();
  const paletteRect = palette.getBoundingClientRect();

  return Math.max(0, paletteRect.right - containerRect.left);
};

/** palette 오른쪽 가용 영역 기준으로 다이어그램 전체를 화면에 맞춘다 */
const fitViewportClearOfPalette = (
  modeler: import("bpmn-js/lib/Modeler").default,
): void => {
  const canvas = modeler.get("canvas") as DiagramCanvas;
  const container = canvas.getContainer();
  const containerRect = container.getBoundingClientRect();
  const bounds = getDiagramElementBounds(modeler);

  if (!bounds || containerRect.width <= 0 || containerRect.height <= 0) {
    canvas.zoom("fit-viewport");
    return;
  }

  const pixelPadding = 16;
  const diagramPadding = 40;
  const paletteRight = getPaletteRightInset(container);
  const availLeft = paletteRight + pixelPadding;
  const availTop = pixelPadding;
  const availW = containerRect.width - availLeft - pixelPadding;
  const availH = containerRect.height - pixelPadding * 2;

  if (availW <= 0 || availH <= 0) {
    canvas.zoom("fit-viewport");
    return;
  }

  const { minX, minY, maxX, maxY } = bounds;
  const contentW = maxX - minX + diagramPadding * 2;
  const contentH = maxY - minY + diagramPadding * 2;
  const contentCenterY = (minY + maxY) / 2;
  const scale = Math.min(availW / contentW, availH / contentH);
  const availCenterY = availTop + availH / 2;

  canvas.viewbox({
    x: minX - diagramPadding - availLeft / scale,
    y: contentCenterY - availCenterY / scale,
    width: containerRect.width / scale,
    height: containerRect.height / scale,
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
    const snapshot = await readDiagramSnapshot(modeler, linksRef.current);
    if (!snapshot) {
      return { xml: "", svg: "", elements: [] };
    }

    const { svg } = await modeler.saveSVG();
    persistCanvasView(modelId, modeler);

    if (
      process.env.NODE_ENV === "development" &&
      snapshot.xml &&
      !hasSavedDiagramLayout(snapshot.xml)
    ) {
      console.warn(
        "[BpmnEditor] 저장 XML에 좌표 정보(bpmndi)가 없습니다. Task 위치가 초기화될 수 있습니다.",
      );
    }

    return {
      xml: snapshot.xml,
      svg: svg ?? "",
      elements: snapshot.elements,
    };
  },
  getDiagramSnapshot: async () => readDiagramSnapshot(modeler, linksRef.current),
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
    fitViewportClearOfPalette(modeler);
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

/** 오버레이 잠금 해제 후 선택 요소의 컨텍스트 패드를 다시 연다 */
const restoreDiagramContextPad = (
  modeler: import("bpmn-js/lib/Modeler").default,
): void => {
  try {
    const selected = (
      modeler.get("selection") as {
        get: () => Array<{ id: string }>;
      }
    ).get()[0];

    if (!selected) {
      return;
    }

    const element = (
      modeler.get("elementRegistry") as {
        get: (id: string) => object | undefined;
      }
    ).get(selected.id);

    if (!element) {
      return;
    }

    const contextPad = modeler.get("contextPad") as {
      open: (target: object) => void;
      isOpen: (target?: object) => boolean;
    };

    if (!contextPad.isOpen(element)) {
      contextPad.open(element);
    }
  } catch {
    // 서비스 미존재
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
  type.includes("Task") ||
  type.includes("SubProcess") ||
  type.includes("CallActivity");

/** 화면 좌표 아래 linkable BPMN 요소 id를 반환한다 (드래그 중 elementFromPoint 오류 방지) */
const resolveLinkableElementAtPoint = (
  modeler: import("bpmn-js/lib/Modeler").default,
  clientX: number,
  clientY: number,
): string | null => {
  const canvas = modeler.get("canvas") as DiagramCanvas;
  const container = canvas.getContainer();
  const rect = container.getBoundingClientRect();

  if (
    clientX < rect.left ||
    clientX > rect.right ||
    clientY < rect.top ||
    clientY > rect.bottom
  ) {
    return null;
  }

  const viewbox = canvas.viewbox();
  const scaleX = rect.width / viewbox.width;
  const scaleY = rect.height / viewbox.height;

  if (scaleX <= 0 || scaleY <= 0) {
    return null;
  }

  const canvasX = viewbox.x + (clientX - rect.left) / scaleX;
  const canvasY = viewbox.y + (clientY - rect.top) / scaleY;

  const elementRegistry = modeler.get("elementRegistry") as {
    forEach: (
      callback: (element: {
        id: string;
        type: string;
        x?: number;
        y?: number;
        width?: number;
        height?: number;
      }) => void,
    ) => void;
  };

  let matchId: string | null = null;
  let smallestArea = Number.POSITIVE_INFINITY;

  elementRegistry.forEach((element) => {
    if (
      !isLinkableType(element.type) ||
      element.x === undefined ||
      element.y === undefined ||
      element.width === undefined ||
      element.height === undefined
    ) {
      return;
    }

    const withinX =
      canvasX >= element.x && canvasX <= element.x + element.width;
    const withinY =
      canvasY >= element.y && canvasY <= element.y + element.height;

    if (!withinX || !withinY) {
      return;
    }

    const area = element.width * element.height;
    if (area < smallestArea) {
      smallestArea = area;
      matchId = element.id;
    }
  });

  return matchId;
};

/** 드롭 가능 Task에 하이라이트 클래스를 적용한다 */
const setDropHighlight = (
  modeler: import("bpmn-js/lib/Modeler").default,
  elementId: string | null,
  highlightRef: RefObject<string | null>,
): void => {
  if (highlightRef.current === elementId) {
    return;
  }

  const canvas = modeler.get("canvas") as DiagramCanvas;
  const container = canvas.getContainer();

  if (highlightRef.current) {
    container
      .querySelector(`[data-element-id="${highlightRef.current}"]`)
      ?.classList.remove("pams-bpmn-drop-target");
  }

  highlightRef.current = elementId;

  if (elementId) {
    container
      .querySelector(`[data-element-id="${elementId}"]`)
      ?.classList.add("pams-bpmn-drop-target");
  }
};

/** shape.replace 후 프로세스 연결 오버레이·선택·표시 이름을 복원한다 */
const syncAfterShapeReplace = (
  modeler: import("bpmn-js/lib/Modeler").default,
  oldShape: { id: string },
  newShape: {
    id: string;
    type: string;
    businessObject?: { name?: string; $type?: string };
  },
  links: Record<string, ProcessLinkInfo>,
  onSelectionChange?: BpmnEditorInnerProps["onSelectionChange"],
  onElementReplaced?: (oldId: string, newId: string) => void,
): void => {
  if (!isLinkableType(newShape.type)) {
    return;
  }

  const elementRegistry = modeler.get("elementRegistry") as {
    get: (id: string) => typeof newShape | undefined;
  };

  const resolvedShape =
    elementRegistry.get(newShape.id) ??
    elementRegistry.get(oldShape.id) ??
    newShape;
  const finalId = resolvedShape.id;
  let link = links[oldShape.id] ?? links[finalId];

  if (!link) {
    const orphanedEntry = Object.entries(links).find(([key, value]) => {
      if (!value || key === finalId || key === oldShape.id) {
        return false;
      }
      return !elementRegistry.get(key);
    });
    if (orphanedEntry) {
      link = orphanedEntry[1];
      onElementReplaced?.(orphanedEntry[0], finalId);
    }
  }

  let activeLinks = links;
  if (link && oldShape.id !== finalId) {
    activeLinks = { ...links, [finalId]: link };
    delete activeLinks[oldShape.id];
    onElementReplaced?.(oldShape.id, finalId);
  }

  refreshLinkOverlays(modeler, activeLinks);

  if (link && resolvedShape.businessObject?.name !== link.name) {
    updateElementName(modeler, finalId, link.name);
  }

  const selection = modeler.get("selection") as {
    select: (elements: object | object[]) => void;
  };
  selection.select(resolvedShape);

  onSelectionChange?.(
    finalId,
    link?.name ?? resolvedShape.businessObject?.name ?? null,
    mapBpmnJsType(resolvedShape.businessObject?.$type ?? resolvedShape.type),
  );
};

let syncingLinkLayout = false;

const LINK_BADGE_FONT = "600 12px system-ui, -apple-system, sans-serif";
const LINK_BADGE_HEIGHT = 17;
const LINK_BADGE_BOTTOM_INSET = 10;
const LINK_BADGE_HORIZONTAL_PADDING = 8;
const LINK_BADGE_TASK_SIDE_INSET = 10;
const MIN_TASK_WIDTH = 100;

type DiagramShape = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const getLinkBadgeLabel = (link: ProcessLinkInfo): string =>
  link.linkKind === "L3_CALL" ? `L3:${link.code}` : link.code;

const measureLinkBadgeWidth = (label: string): number => {
  if (typeof document === "undefined") {
    return label.length * 7 + LINK_BADGE_HORIZONTAL_PADDING;
  }

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) {
    return label.length * 7 + LINK_BADGE_HORIZONTAL_PADDING;
  }

  context.font = LINK_BADGE_FONT;
  return Math.ceil(context.measureText(label).width) + LINK_BADGE_HORIZONTAL_PADDING;
};

const computeRequiredTaskWidth = (badgeLabel: string): number =>
  Math.max(
    MIN_TASK_WIDTH,
    measureLinkBadgeWidth(badgeLabel) + LINK_BADGE_TASK_SIDE_INSET * 2,
  );

/** 프로세스 코드가 태스크 안에 들어가도록 너비를 확장한다 */
const ensureTaskWidthForLinkBadge = (
  modeler: import("bpmn-js/lib/Modeler").default,
  element: DiagramShape,
  requiredWidth: number,
): DiagramShape => {
  if (requiredWidth <= element.width + 0.5) {
    return element;
  }

  const modeling = modeler.get("modeling") as {
    resizeShape: (
      shape: object,
      newBounds: DiagramShape,
    ) => void;
  };

  const newBounds: DiagramShape = {
    x: element.x,
    y: element.y,
    width: requiredWidth,
    height: element.height,
  };

  try {
    modeling.resizeShape(element, newBounds);
  } catch {
    return element;
  }

  return newBounds;
};

const refreshLinkOverlays = (
  modeler: import("bpmn-js/lib/Modeler").default,
  links: Record<string, ProcessLinkInfo>,
) => {
  syncingLinkLayout = true;

  try {
    const overlays = modeler.get("overlays") as {
      clear: () => void;
      add: (
        elementId: string,
        overlayId: string,
        options: {
          position: { top: number; left: number };
          html: string;
        },
      ) => void;
    };
    const elementRegistry = modeler.get("elementRegistry") as {
      get: (id: string) => (DiagramShape & object) | undefined;
    };

    overlays.clear();

    for (const [elementId, link] of Object.entries(links)) {
      if (!link) {
        continue;
      }

      const element = elementRegistry.get(elementId);
      if (!element) {
        continue;
      }

      const badgeLabel = getLinkBadgeLabel(link);
      const requiredWidth = computeRequiredTaskWidth(badgeLabel);
      const layout = ensureTaskWidthForLinkBadge(modeler, element, requiredWidth);
      const elementWidth = layout.width;
      const elementHeight = layout.height;
      const badgeTop = Math.max(
        elementHeight - LINK_BADGE_HEIGHT - LINK_BADGE_BOTTOM_INSET,
        0,
      );
      const label = escapeHtml(badgeLabel);

      try {
        overlays.add(elementId, "pams-link", {
          position: {
            top: badgeTop,
            left: elementWidth / 2,
          },
          html: `<div class="pams-bpmn-link-badge-wrap"><div class="pams-bpmn-link-badge ${link.linkKind === "L3_CALL" ? "pams-bpmn-link-badge-l3" : ""}" title="${escapeHtml(link.name)}">${label}</div></div>`,
        });
      } catch {
        // 요소 미존재
      }
    }
  } finally {
    queueMicrotask(() => {
      syncingLinkLayout = false;
    });
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
      properties: link ? toBpmnElementLinkProperties(link) : null,
    });
  });

  return results;
};

/** 저장 없이 현재 다이어그램 XML·연결 목록을 읽는다 */
const readDiagramSnapshot = async (
  modeler: import("bpmn-js/lib/Modeler").default,
  links: Record<string, ProcessLinkInfo>,
): Promise<BpmnEditorDiagramSnapshot | null> => {
  const { xml: savedXml } = await modeler.saveXML({ format: true });
  if (!savedXml) {
    return null;
  }

  return {
    xml: savedXml,
    elements: extractElements(modeler, links),
  };
};
