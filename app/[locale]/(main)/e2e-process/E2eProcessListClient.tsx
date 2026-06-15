"use client";

import { GitBranch } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { E2eProcessDetail } from "@/components/e2e-process/E2eProcessDetail";
import { E2eProcessForm } from "@/components/e2e-process/E2eProcessForm";
import {
  ContentPanel,
  ListPageBody,
  ListPageLayout,
  PageActions,
  PageContent,
  PageHeader,
} from "@/components/common/layout";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { DataTable, type DataTableColumn } from "@/components/common/DataTable";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { StatusBadge } from "@/components/common/StatusBadge";
import { useE2eProcessList } from "@/lib/query/hooks/useE2eProcess";
import type { E2eProcessDto } from "@/types/e2e-process";

type SheetState =
  | { type: "detail"; process: E2eProcessDto }
  | { type: "create" }
  | { type: "edit"; process: E2eProcessDto };

/** E2E 프로세스 목록 클라이언트 */
export const E2eProcessListClient = () => {
  const t = useTranslations("e2eProcess");
  const tm = useTranslations("menu");
  const { data: items, isLoading } = useE2eProcessList();
  const [sheet, setSheet] = useState<SheetState | null>(null);

  const columns: DataTableColumn<E2eProcessDto>[] = [
    { key: "code", header: t("code"), cell: (row) => row.code },
    { key: "name", header: t("name"), cell: (row) => row.name },
    {
      key: "status",
      header: t("status"),
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "participants",
      header: t("participants"),
      cell: (row) => String(row.participantL3Count ?? 0),
    },
  ];

  return (
    <ListPageLayout>
      <PageHeader
        title={tm("e2eProcess")}
        description={t("listDesc")}
        icon={GitBranch}
        actions={
          <PageActions
            showSearch={false}
            onRegister={() => setSheet({ type: "create" })}
            registerLabel={t("new")}
          />
        }
      />
      <ListPageBody
        content={
          <PageContent>
            <ContentPanel title={tm("e2eProcess")} icon bodyClassName="p-4">
              {isLoading ? (
                <LoadingSpinner />
              ) : (
                <DataTable
                  columns={columns}
                  data={items ?? []}
                  rowKey={(row) => row.e2eProcessId}
                  onRowClick={(row) => setSheet({ type: "detail", process: row })}
                />
              )}
            </ContentPanel>
          </PageContent>
        }
      />

      <Sheet open={Boolean(sheet)} onOpenChange={(open) => !open && setSheet(null)}>
        <SheetContent
          side="right"
          className="w-[min(768px,calc(100vw-2rem))] gap-0 p-0"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>{t("detailTitle")}</SheetTitle>
            <SheetDescription>{t("listDesc")}</SheetDescription>
          </SheetHeader>
          {sheet?.type === "detail" && (
            <E2eProcessDetail
              e2eProcessId={sheet.process.e2eProcessId}
              onEdit={(process) => setSheet({ type: "edit", process })}
            />
          )}
          {sheet?.type === "create" && (
            <E2eProcessForm
              mode="create"
              onCancel={() => setSheet(null)}
              onSuccess={(process) => setSheet({ type: "detail", process })}
            />
          )}
          {sheet?.type === "edit" && (
            <E2eProcessForm
              mode="edit"
              initialData={sheet.process}
              onCancel={() => setSheet({ type: "detail", process: sheet.process })}
              onSuccess={(process) => setSheet({ type: "detail", process })}
            />
          )}
        </SheetContent>
      </Sheet>
    </ListPageLayout>
  );
};
