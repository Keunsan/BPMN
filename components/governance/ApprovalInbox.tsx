"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { DataTable, type DataTableColumn } from "@/components/common/DataTable";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
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
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
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
    { key: "code", header: "Code", cell: (r) => r.code },
    { key: "name", header: "Name", cell: (r) => r.name },
    { key: "level", header: "Level", cell: (r) => r.level },
    {
      key: "status",
      header: "Status",
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
            승인
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              mutation.mutate({
                requestId: r.request_id,
                action: "REJECT",
              })
            }
            disabled={mutation.isPending}
          >
            반려
          </Button>
        </div>
      ),
    },
  ];

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="p-6">
      <h1 className="mb-4 text-2xl font-semibold">승인 대기함</h1>
      {!data?.length ? (
        <EmptyState title="승인 대기 항목이 없습니다." />
      ) : (
        <DataTable columns={columns} data={data} rowKey={(r) => r.request_id} />
      )}
    </div>
  );
};
