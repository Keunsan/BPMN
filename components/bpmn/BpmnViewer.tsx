"use client";

import { useEffect, useRef } from "react";

import type { BpmnElementDiff } from "@/types/bpmn";

import "bpmn-js/dist/assets/diagram-js.css";
import "bpmn-js/dist/assets/bpmn-js.css";
import "bpmn-js/dist/assets/bpmn-font/css/bpmn.css";
import "@bpmn-io/properties-panel/dist/assets/properties-panel.css";
import "diagram-js-minimap/assets/diagram-js-minimap.css";
import "./bpmn-editor.css";

type BpmnViewerProps = {
  xml: string | null;
  className?: string;
  highlightDiff?: BpmnElementDiff[];
  links?: Record<string, { nodeId: number; code: string; name: string; linkKind: string }>;
  onCallActivityDblClick?: (link: {
    nodeId: number;
    code: string;
    name: string;
  }) => void;
};

/** BPMN 읽기 전용 뷰어 (비교 화면용) */
export const BpmnViewer = ({
  xml,
  className,
  highlightDiff = [],
  links = {},
  onCallActivityDblClick,
}: BpmnViewerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<import("bpmn-js/lib/NavigatedViewer").default | null>(
    null,
  );
  const linksRef = useRef(links);
  const onDblClickRef = useRef(onCallActivityDblClick);

  useEffect(() => {
    linksRef.current = links;
  }, [links]);

  useEffect(() => {
    onDblClickRef.current = onCallActivityDblClick;
  }, [onCallActivityDblClick]);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    let destroyed = false;

    const init = async () => {
      const NavigatedViewer = (await import("bpmn-js/lib/NavigatedViewer"))
        .default;

      if (destroyed || !containerRef.current) {
        return;
      }

      const viewer = new NavigatedViewer({
        container: containerRef.current,
      });

      viewerRef.current = viewer;

      if (xml?.trim()) {
        try {
          await viewer.importXML(xml);
          const canvas = viewer.get("canvas") as {
            zoom: (mode: string) => void;
          };
          canvas.zoom("fit-viewport");
          applyHighlights(viewer, highlightDiff);

          const eventBus = viewer.get("eventBus") as {
            on: (
              event: string,
              callback: (e: {
                element?: { id: string; businessObject?: { $type?: string } };
              }) => void,
            ) => void;
          };
          eventBus.on("element.dblclick", (e) => {
            const element = e.element;
            if (!element?.id) {
              return;
            }
            const link = linksRef.current[element.id];
            if (link?.linkKind === "L3_CALL") {
              onDblClickRef.current?.({
                nodeId: link.nodeId,
                code: link.code,
                name: link.name,
              });
            }
          });
        } catch (err) {
          console.error("[BpmnViewer] import failed:", err);
        }
      }
    };

    void init();

    return () => {
      destroyed = true;
      viewerRef.current?.destroy();
      viewerRef.current = null;
    };
  }, [xml, highlightDiff, links, onCallActivityDblClick]);

  return (
    <div
      ref={containerRef}
      className={`pams-bpmn-viewer h-full min-h-[360px] ${className ?? ""}`}
    />
  );
};

/** diff 결과에 따라 요소 하이라이트 */
const applyHighlights = (
  viewer: import("bpmn-js/lib/NavigatedViewer").default,
  diff: BpmnElementDiff[],
) => {
  if (!diff.length) {
    return;
  }

  const canvas = viewer.get("canvas") as {
    addMarker: (id: string, className: string) => void;
  };

  for (const item of diff) {
    const markerClass =
      item.changeType === "added"
        ? "pams-bpmn-diff-added"
        : item.changeType === "removed"
          ? "pams-bpmn-diff-removed"
          : "pams-bpmn-diff-modified";

    try {
      canvas.addMarker(item.elementBpmnId, markerClass);
    } catch {
      // 요소가 없을 수 있음
    }
  }
};
