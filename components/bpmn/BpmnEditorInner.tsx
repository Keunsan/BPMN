"use client";

import { useEffect, useRef, type RefObject } from "react";

import { EMPTY_BPMN_XML, mapBpmnJsType } from "@/lib/utils/bpmn-xml";
import type { BpmnElementLinkDto } from "@/types/bpmn";

import type { ProcessLinkInfo } from "./ProcessLinkModal";

import "bpmn-js/dist/assets/diagram-js.css";
import "bpmn-js/dist/assets/bpmn-js.css";
import "bpmn-js/dist/assets/bpmn-font/css/bpmn.css";
import "@bpmn-io/properties-panel/dist/assets/properties-panel.css";
import "diagram-js-minimap/assets/diagram-js-minimap.css";
import "./bpmn-editor.css";

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
  getSelectedElementId: () => string | null;
  getSelectedElementName: () => string | null;
  toggleMinimap: () => void;
};

type BpmnEditorInnerProps = {
  xml: string | null;
  links: Record<string, ProcessLinkInfo>;
  onSelectionChange?: (elementId: string | null, elementName?: string | null) => void;
  onReady?: (api: BpmnEditorHandle) => void;
};

/** bpmn-js 모델러 본체 */
export const BpmnEditorInner = ({
  xml,
  links,
  onSelectionChange,
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
      const minimapModule = (await import("diagram-js-minimap")).default;

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
        const canvas = modeler.get("canvas") as {
          zoom: (mode: string) => void;
        };
        canvas.zoom("fit-viewport");
        refreshLinkOverlays(modeler, linksRef.current);
      } catch (err) {
        console.error("[BpmnEditor] import failed:", err);
      }

      const eventBus = modeler.get("eventBus") as {
        on: (
          event: string,
          callback: (e: {
            newSelection?: Array<{
              id: string;
              type: string;
              businessObject?: { name?: string };
            }>;
          }) => void,
        ) => void;
      };

      eventBus.on("selection.changed", (e) => {
        const selected = e.newSelection?.[0];
        if (!selected || !isLinkableType(selected.type)) {
          onSelectionChange?.(null, null);
          return;
        }
        onSelectionChange?.(selected.id, selected.businessObject?.name ?? null);
      });

      onReady?.(createEditorApi(modeler, linksRef));
    };

    void init();

    return () => {
      destroyed = true;
      modelerRef.current?.destroy();
      modelerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 초기 XML만 로드
  }, [xml]);

  useEffect(() => {
    if (modelerRef.current) {
      refreshLinkOverlays(modelerRef.current, links);
    }
  }, [links]);

  return (
    <div className="pams-bpmn-root">
      <div ref={canvasRef} className="pams-bpmn-canvas" />
      <div ref={propertiesRef} className="pams-bpmn-properties" />
    </div>
  );
};

const createEditorApi = (
  modeler: import("bpmn-js/lib/Modeler").default,
  linksRef: RefObject<Record<string, ProcessLinkInfo>>,
): BpmnEditorHandle => ({
  save: async () => {
    const { xml: savedXml } = await modeler.saveXML({ format: true });
    const { svg } = await modeler.saveSVG();
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
    (modeler.get("canvas") as { zoom: (m: string) => void }).zoom("fit-viewport");
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
    (modeler.get("minimap") as { toggle: () => void }).toggle();
  },
});

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

    const link = links[element.id];
    results.push({
      elementBpmnId: element.businessObject?.id ?? element.id,
      elementType: mapped,
      elementName: element.businessObject?.name ?? null,
      linkedNodeId: link?.nodeId ?? null,
    });
  });

  return results;
};
