"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";

import { BpmnDrilldownViewer } from "@/components/bpmn/BpmnDrilldownViewer";
import type { DrilldownViewerLink } from "@/components/bpmn/pams-drilldown-provider";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Link } from "@/lib/i18n/navigation";
import { useBpmnDetail } from "@/lib/query/hooks/useBpmn";
import { useEnsureE2eBpmn, useE2eProcessDetail } from "@/lib/query/hooks/useE2eProcess";
import { parseProcessLinkInfo } from "@/lib/utils/bpmn-link";
import { cn } from "@/lib/utils";

type E2eBpmnViewerSheetProps = {
  e2eProcessId: number | null;
  e2eLabel?: string;
  e2eCode?: string;
  modelId?: number | null;
  onClose: () => void;
};

/** E2E BPMN 읽기 전용 뷰어 — 운영지식그래프 Inspector 등 */
export const E2eBpmnViewerSheet = ({
  e2eProcessId,
  e2eLabel,
  e2eCode,
  modelId: modelIdProp,
  onClose,
}: E2eBpmnViewerSheetProps) => {
  const t = useTranslations("bpmn");
  const to = useTranslations("operationsGraph");
  const ensureMutation = useEnsureE2eBpmn();
  const { data: e2eDetail } = useE2eProcessDetail(e2eProcessId ?? 0);
  const resolvedModelId =
    modelIdProp ?? e2eDetail?.currentBpmnModelId ?? ensureMutation.data?.modelId ?? null;
  const { data: model, isLoading } = useBpmnDetail(resolvedModelId ?? 0);

  const links = useMemo((): Record<string, DrilldownViewerLink> => {
    const map: Record<string, DrilldownViewerLink> = {};
    for (const el of model?.elements ?? []) {
      if (!el.linkedNodeId) {
        continue;
      }
      const info = parseProcessLinkInfo(
        el.linkedNodeId,
        el.linkedProcessCode ?? String(el.linkedNodeId),
        el.linkedProcessName ?? el.elementName ?? "",
        el.elementType,
        el.properties,
      );
      map[el.elementBpmnId] = {
        nodeId: info.nodeId,
        code: info.code,
        name: info.name,
        linkKind: info.linkKind,
      };
    }
    return map;
  }, [model?.elements]);

  const rootLabel =
    e2eCode && e2eLabel
      ? `${e2eCode} · ${e2eLabel}`
      : (e2eLabel ?? to("nodeKind.E2E"));

  const handleEnsure = () => {
    if (!e2eProcessId) {
      return;
    }
    ensureMutation.mutate(e2eProcessId);
  };

  return (
    <Sheet
      open={Boolean(e2eProcessId)}
      onOpenChange={(open) => !open && onClose()}
    >
      <SheetContent side="bottom" className="h-[min(75vh,720px)] gap-0 p-0">
        <SheetHeader className="border-b px-4 py-3 text-left">
          <SheetTitle className="text-base">{to("inspector.viewE2eBpmn")}</SheetTitle>
          <SheetDescription>{rootLabel}</SheetDescription>
          <div className="flex flex-wrap gap-2 pt-2">
            {model?.modelId ? (
              <Link
                href={`/bpmn/${model.modelId}`}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                {t("edit")}
              </Link>
            ) : e2eProcessId ? (
              <Button
                variant="outline"
                size="sm"
                disabled={ensureMutation.isPending}
                onClick={handleEnsure}
              >
                {t("create")}
              </Button>
            ) : null}
            {e2eProcessId ? (
              <Link
                href={`/e2e-process?selected=${e2eProcessId}`}
                className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
              >
                {to("inspector.openE2eCatalog")}
              </Link>
            ) : null}
          </div>
        </SheetHeader>
        <div className="min-h-0 flex-1">
          {isLoading ? (
            <LoadingSpinner className="h-full min-h-[280px]" />
          ) : model?.bpmnXml ? (
            <BpmnDrilldownViewer
              rootLabel={rootLabel}
              xml={model.bpmnXml}
              links={links}
              className="h-full"
            />
          ) : (
            <p className="p-4 text-sm text-muted-foreground">{t("emptyDesc")}</p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
