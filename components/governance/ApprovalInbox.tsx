"use client";

import { Inbox } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

import { DataTable, type DataTableColumn } from "@/components/common/DataTable";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import {
  ListPageBody,
  ListPageLayout,
  PageActions,
  PageContent,
  PageHeader,
} from "@/components/common/layout";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { showErrorToast } from "@/components/common/ErrorToast";
import { ApiError } from "@/lib/api/error-handler";
import { apiGet, apiPut } from "@/lib/api/client";
import type { ProcessStatus } from "@/types/process";

type ApprovalRow = {
  request_id: number;
  entity_id: number;
  code: string;
  name: string;
  level: string;
  status: string;
  requested_at: string;
  request_comment: string | null;
};

/** 승인 대기함 */
export const ApprovalInbox = () => {
  const t = useTranslations("governance");
  const tc = useTranslations("common");
  const qc = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["governance", "approvals"],
    queryFn: () => apiGet<ApprovalRow[]>("/api/governance/approvals"),
  });

  const mutation = useMutation({
    mutationFn: (input: {
      requestId: number;
      action: "APPROVE" | "REJECT";
    }) => apiPut("/api/governance/approvals", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["governance", "approvals"] }),
    onError: (e) => {
      if (e instanceof ApiError) showErrorToast(e);
    },
  });

  const columns: DataTableColumn<ApprovalRow>[] = [
    { key: "code", header: t("code"), cell: (r) => r.code },
    { key: "name", header: t("name"), cell: (r) => r.name },
    { key: "level", header: t("level"), cell: (r) => r.level },
    {
      key: "status",
      header: t("status"),
      cell: () => <StatusBadge status={"IN_REVIEW" as ProcessStatus} />,
    },
    {
      key: "actions",
      header: "",
      cell: (r) => (
        <div className="flex gap-1">
          <Button
            size="sm"
            onClick={() =>
              mutation.mutate({
                requestId: r.request_id,
                action: "APPROVE",
              })
            }
            disabled={mutation.isPending}
          >
            {t("approve")}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="pams-page-action-outline"
            onClick={() =>
              mutation.mutate({
                requestId: r.request_id,
                action: "REJECT",
              })
            }
            disabled={mutation.isPending}
          >
            {t("reject")}
          </Button>
        </div>
      ),
    },
  ];

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <ListPageLayout>
      <PageHeader
        title={t("approvalTitle")}
        description={t("approvalDesc")}
        icon={Inbox}
        actions={
          <PageActions
            onSearch={() => void refetch()}
            showRegister={false}
          />
        }
      />
      <ListPageBody
        content={
          <PageContent>
            <DataTable
              title={t("approvalTitle")}
              count={data?.length ?? 0}
              countSuffix={tc("countUnit")}
              icon
              columns={columns}
              data={data ?? []}
              rowKey={(r) => r.request_id}
              storageKey="pams-approval-inbox-grid"
              emptyMessage={t("approvalEmpty")}
            />
          </PageContent>
        }
      />
    </ListPageLayout>
  );
};
