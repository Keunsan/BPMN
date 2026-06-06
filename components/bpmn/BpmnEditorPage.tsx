"use client";

import { useTranslations } from "next-intl";

import { EmptyState } from "@/components/common/EmptyState";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { useRouter } from "@/lib/i18n/navigation";
import { useBpmnDetail, useSaveBpmn } from "@/lib/query/hooks/useBpmn";

import { BpmnEditor } from "./BpmnEditor";

type BpmnEditorPageProps = {
  modelId: number;
};

/** BPMN 에디터 페이지 (클라이언트) */
export const BpmnEditorPage = ({ modelId }: BpmnEditorPageProps) => {
  const t = useTranslations("bpmn");
  const router = useRouter();
  const { data: model, isLoading, fetchStatus } = useBpmnDetail(modelId);
  const saveMutation = useSaveBpmn(modelId);

  if (isLoading || fetchStatus === "fetching") {
    return <LoadingSpinner label={t("loading")} className="min-h-[50vh]" />;
  }

  if (!model) {
    return <EmptyState title={t("notFound")} />;
  }

  return (
    <BpmnEditor
      model={model}
      saving={saveMutation.isPending}
      onSave={async (payload) => {
        const updated = await saveMutation.mutateAsync(payload);
        if (updated.modelId !== modelId) {
          router.replace(`/bpmn/${updated.modelId}`);
        }
      }}
    />
  );
};
