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
};

/** BPMN 읽기 전용 뷰어 (비교 화면용) */
export const BpmnViewer = ({
  xml,
  className,
  highlightDiff = [],
}: BpmnViewerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<import("bpmn-js/lib/NavigatedViewer").default | null>(
    null,
  );

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
  }, [xml, highlightDiff]);

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
