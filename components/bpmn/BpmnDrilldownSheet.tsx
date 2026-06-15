"use client";

import { useTranslations } from "next-intl";

import { BpmnViewer } from "@/components/bpmn/BpmnViewer";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useL4Slice } from "@/lib/query/hooks/useE2eProcess";
import { Link } from "@/lib/i18n/navigation";

export type DrilldownTarget = {
  l3NodeId: number;
  l3Name: string;
  l3Code: string;
  parentLabel?: string;
};

type BpmnDrilldownSheetProps = {
  target: DrilldownTarget | null;
  onClose: () => void;
};

/** Call Activity drill-down — L4 slice 읽기 전용 */
export const BpmnDrilldownSheet = ({
  target,
  onClose,
}: BpmnDrilldownSheetProps) => {
  const t = useTranslations("bpmn");
  const { data: slice, isLoading } = useL4Slice(
    target?.l3NodeId ?? 0,
    Boolean(target),
  );

  return (
    <Sheet open={Boolean(target)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="bottom"
        className="h-[min(70vh,640px)] gap-0 p-0"
      >
        <SheetHeader className="border-b px-4 py-3 text-left">
          <SheetTitle className="text-base">
            {target
              ? `${target.parentLabel ? `${target.parentLabel} > ` : ""}${target.l3Code} · ${target.l3Name}`
              : t("drilldownTitle")}
          </SheetTitle>
          <SheetDescription>{t("drilldownDesc")}</SheetDescription>
          {target ? (
            <div className="pt-2">
              <Link
                href={`/process?nodeId=${target.l3NodeId}`}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                {t("openL3Process")}
              </Link>
            </div>
          ) : null}
        </SheetHeader>
        <div className="min-h-0 flex-1 p-2">
          {isLoading ? (
            <LoadingSpinner className="h-full min-h-[240px]" />
          ) : slice?.xml ? (
            <BpmnViewer xml={slice.xml} className="h-full" />
          ) : (
            <p className="p-4 text-sm text-muted-foreground">{t("drilldownEmpty")}</p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
