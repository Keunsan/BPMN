"use client";

import { ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { BpmnViewer } from "@/components/bpmn/BpmnViewer";
import {
  formatDrilldownFrameLabel,
  type DrilldownStackFrame,
  type DrilldownViewerLink,
  type L3CallTarget,
} from "@/components/bpmn/pams-drilldown-provider";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { apiGet } from "@/lib/api/client";
import { bpmnKeys } from "@/lib/query/keys";
import { cn } from "@/lib/utils";

type L4SliceResponse = {
  xml: string;
  l3NodeId: number;
  l3Code: string;
  l3Name: string;
  sourceModelId: number;
} | null;

type BpmnDrilldownViewerProps = {
  rootLabel: string;
  xml: string | null;
  links?: Record<string, DrilldownViewerLink>;
  className?: string;
};

/** E2E/L3 BPMN 읽기 전용 — Call Activity drill-down + breadcrumb */
export const BpmnDrilldownViewer = ({
  rootLabel,
  xml,
  links = {},
  className,
}: BpmnDrilldownViewerProps) => {
  const t = useTranslations("bpmn");
  const queryClient = useQueryClient();
  const [stack, setStack] = useState<DrilldownStackFrame[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (xml?.trim()) {
      setStack([
        {
          key: "root",
          label: rootLabel,
          xml: xml.trim(),
          links,
        },
      ]);
    } else {
      setStack([]);
    }
  }, [xml, rootLabel, links]);

  const activeFrame = stack[stack.length - 1];

  const viewerLinks = useMemo(
    () => activeFrame?.links ?? {},
    [activeFrame?.links],
  );

  const handleCallActivityDblClick = useCallback(
    async (target: L3CallTarget) => {
      setLoading(true);
      try {
        const slice = await queryClient.fetchQuery({
          queryKey: bpmnKeys.l4Slice(target.nodeId),
          queryFn: () =>
            apiGet<L4SliceResponse>(`/api/bpmn/l3/${target.nodeId}/l4-slice`),
        });

        if (!slice?.xml?.trim()) {
          return;
        }

        const parentLabel = activeFrame?.label ?? rootLabel;
        setStack((prev) => [
          ...prev,
          {
            key: `l3-${target.nodeId}`,
            label: formatDrilldownFrameLabel(
              parentLabel,
              slice.l3Code || target.code,
              slice.l3Name || target.name,
            ),
            xml: slice.xml,
            links: {},
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [activeFrame?.label, queryClient, rootLabel],
  );

  const onViewerDblClick = useCallback(
    (target: L3CallTarget) => {
      void handleCallActivityDblClick(target);
    },
    [handleCallActivityDblClick],
  );

  const navigateToIndex = (index: number) => {
    setStack((prev) => prev.slice(0, index + 1));
  };

  if (!activeFrame) {
    return (
      <p className="p-4 text-sm text-muted-foreground">{t("drilldownEmpty")}</p>
    );
  }

  return (
    <div className={cn("flex h-full min-h-0 flex-col", className)}>
      {stack.length > 1 ? (
        <nav
          aria-label={t("drilldownTitle")}
          className="flex flex-wrap items-center gap-1 border-b px-3 py-2 text-xs"
        >
          {stack.map((frame, index) => (
            <span key={frame.key} className="inline-flex items-center gap-1">
              {index > 0 ? (
                <ChevronRight className="size-3 text-muted-foreground" aria-hidden />
              ) : null}
              <button
                type="button"
                className={cn(
                  "rounded px-1 py-0.5 text-left hover:bg-muted",
                  index === stack.length - 1 && "font-medium text-foreground",
                  index < stack.length - 1 && "text-muted-foreground",
                )}
                disabled={index === stack.length - 1}
                onClick={() => navigateToIndex(index)}
              >
                {frame.label}
              </button>
            </span>
          ))}
        </nav>
      ) : null}
      <div className="relative min-h-0 flex-1">
        {loading ? (
          <LoadingSpinner className="absolute inset-0 z-10 bg-background/60" />
        ) : null}
        <BpmnViewer
          xml={activeFrame.xml}
          links={viewerLinks}
          onCallActivityDblClick={onViewerDblClick}
          className="h-full min-h-[320px]"
        />
      </div>
    </div>
  );
};
