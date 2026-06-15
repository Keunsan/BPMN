"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  useDeleteE2eProcess,
  useEnsureE2eBpmn,
  useE2eProcessDetail,
} from "@/lib/query/hooks/useE2eProcess";
import { useRouter } from "@/lib/i18n/navigation";
import type { E2eProcessDto } from "@/types/e2e-process";

type E2eProcessDetailProps = {
  e2eProcessId: number;
  onEdit?: (process: E2eProcessDto) => void;
};

/** E2E 프로세스 상세 패널 */
export const E2eProcessDetail = ({
  e2eProcessId,
  onEdit,
}: E2eProcessDetailProps) => {
  const t = useTranslations("e2eProcess");
  const router = useRouter();
  const { data: process, isLoading } = useE2eProcessDetail(e2eProcessId);
  const ensureBpmn = useEnsureE2eBpmn();
  const deleteMutation = useDeleteE2eProcess();
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (isLoading || !process) {
    return <LoadingSpinner className="py-8" />;
  }

  const openBpmnEditor = async () => {
    const { modelId } = await ensureBpmn.mutateAsync(process.e2eProcessId);
    router.push(`/bpmn/${modelId}`);
  };

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{process.code}</p>
          <h2 className="text-xl font-semibold">{process.name}</h2>
          <div className="mt-2">
            <StatusBadge status={process.status} />
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          {onEdit ? (
            <Button variant="outline" size="sm" onClick={() => onEdit(process)}>
              {t("edit")}
            </Button>
          ) : null}
          <Button
            size="sm"
            onClick={() => void openBpmnEditor()}
            disabled={ensureBpmn.isPending}
          >
            {t("editFlow")}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("basicInfo")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {process.description ? (
            <p className="whitespace-pre-wrap text-muted-foreground">
              {process.description}
            </p>
          ) : (
            <p className="text-muted-foreground">{t("noDescription")}</p>
          )}
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span>
              {t("participantL3Count", { count: process.participantL3Count ?? 0 })}
            </span>
            <span>v{process.version}</span>
          </div>
          {process.tags?.length ? (
            <p className="text-xs">
              {t("tags")}: {process.tags.join(", ")}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Button
        variant="destructive"
        size="sm"
        className="self-start"
        onClick={() => setDeleteOpen(true)}
      >
        {t("delete")}
      </Button>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={t("deleteConfirmTitle")}
        description={t("deleteConfirmDesc")}
        confirmLabel={t("delete")}
        onConfirm={async () => {
          await deleteMutation.mutateAsync(process.e2eProcessId);
          setDeleteOpen(false);
        }}
      />
    </div>
  );
};
