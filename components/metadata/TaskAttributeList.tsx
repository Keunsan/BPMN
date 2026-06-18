"use client";

import { ClipboardList, ExternalLink, GitBranch } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { DataGrid, type DataGridColumn } from "@/components/common/DataGrid";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import {
  ListPageLayout,
  PageActions,
  PageContent,
  PageHeader,
} from "@/components/common/layout";
import { SearchBar } from "@/components/common/SearchBar";
import { StatusBadge } from "@/components/common/StatusBadge";
import {
  TaskAttributeForm,
  TaskAttributeSheetHeaderActions,
  TaskAttributeSheetProvider,
} from "@/components/metadata/TaskAttributeForm";
import { TaskMappingSideLayout } from "@/components/metadata/TaskMappingSideLayout";
import { useProcessScopeParams } from "@/components/process/ProcessScopeFilter";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useDebounce } from "@/hooks/useDebounce";
import { Link } from "@/lib/i18n/navigation";
import { useTaskAttributeList } from "@/lib/query/hooks/useMetadata";
import type { TaskAttributeListItem } from "@/types/metadata";
import type { E2eProcessDto } from "@/types/e2e-process";
import type { ProcessNodeTree } from "@/types/process";

type TaskAttributeSelection =
  | { kind: "process"; node: ProcessNodeTree }
  | { kind: "e2e"; process: E2eProcessDto };

/** BPMN에서 등록한 Task 속성 목록 — 프로세스 트리 선택 기준 */
export const TaskAttributeList = () => {
  const t = useTranslations("metadata");
  const tc = useTranslations("common");
  const ts = useTranslations("systemMapping");
  const { companyCode, businessUnitCode, setScope, filters: scopeFilters } =
    useProcessScopeParams();
  const [search, setSearch] = useState("");
  const [selection, setSelection] = useState<TaskAttributeSelection | null>(null);
  const [detailNodeId, setDetailNodeId] = useState<number | null>(null);
  const sheetBodyRef = useRef<HTMLDivElement>(null);
  const debouncedSearch = useDebounce(search, 300);

  const handleScopeChange = useCallback(
    (scope: Parameters<typeof setScope>[0]) => {
      setSelection(null);
      setScope(scope);
    },
    [setScope],
  );

  const handleSelectProcess = useCallback((node: ProcessNodeTree) => {
    setSelection({ kind: "process", node });
  }, []);

  const handleSelectE2e = useCallback((process: E2eProcessDto) => {
    setSelection({ kind: "e2e", process });
  }, []);

  const filters = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      nodeId: selection?.kind === "process" ? selection.node.nodeId : undefined,
      e2eProcessId:
        selection?.kind === "e2e" ? selection.process.e2eProcessId : undefined,
    }),
    [debouncedSearch, selection],
  );

  const {
    data: items,
    isLoading,
    error,
    refetch,
  } = useTaskAttributeList(filters, {
    enabled: Boolean(selection),
  });

  const selectedItem = useMemo(
    () => items?.find((item) => item.nodeId === detailNodeId) ?? null,
    [detailNodeId, items],
  );

  const listColumns = useMemo<DataGridColumn<TaskAttributeListItem>[]>(
    () => [
      {
        key: "no",
        header: "No.",
        width: 48,
        minWidth: 44,
        align: "center",
        cell: (_item, rowIndex) => rowIndex + 1,
      },
      {
        key: "processCode",
        header: t("processCode"),
        width: 120,
        minWidth: 96,
        sortable: true,
        filter: "text",
        value: (item) => item.processCode,
        cell: (item) => (
          <span className="font-mono text-[11px]">{item.processCode}</span>
        ),
      },
      {
        key: "processName",
        header: t("processName"),
        width: 180,
        minWidth: 140,
        sortable: true,
        filter: "text",
        value: (item) => item.processName,
        cell: (item) => (
          <span className="truncate font-medium">{item.processName}</span>
        ),
      },
      {
        key: "processLevel",
        header: t("level"),
        width: 52,
        minWidth: 44,
        align: "center",
        sortable: true,
        filter: "select",
        value: (item) => item.processLevel,
        cell: (item) => item.processLevel,
      },
      {
        key: "parentCode",
        header: t("parentCode"),
        width: 120,
        minWidth: 96,
        sortable: true,
        filter: "text",
        value: (item) => item.parentCode ?? "",
        cell: (item) =>
          item.parentCode ? (
            <span className="truncate font-mono text-[11px]">
              {item.parentCode}
            </span>
          ) : (
            "-"
          ),
      },
      {
        key: "parentName",
        header: t("parentName"),
        width: 140,
        minWidth: 120,
        sortable: true,
        filter: "text",
        value: (item) => item.parentName ?? "",
        cell: (item) => (
          <span className="truncate">{item.parentName ?? "-"}</span>
        ),
      },
      {
        key: "definition",
        header: t("definition"),
        width: 200,
        minWidth: 160,
        sortable: true,
        filter: "text",
        value: (item) => item.definition ?? "",
        cell: (item) => (
          <span className="line-clamp-2">{item.definition || "-"}</span>
        ),
      },
      {
        key: "purpose",
        header: t("purpose"),
        width: 160,
        minWidth: 120,
        sortable: true,
        filter: "text",
        value: (item) => item.purpose ?? "",
        cell: (item) => (
          <span className="line-clamp-2">{item.purpose ?? "-"}</span>
        ),
      },
      {
        key: "bpmnModel",
        header: t("bpmnModel"),
        width: 160,
        minWidth: 120,
        sortable: true,
        filter: "text",
        value: (item) => item.bpmnModelName ?? "",
        cell: (item) =>
          item.bpmnModelId ? (
            <Link
              href={`/bpmn/${item.bpmnModelId}`}
              className="inline-flex max-w-full items-center gap-1 truncate text-primary hover:underline"
            >
              <span className="truncate">{item.bpmnModelName}</span>
              <ExternalLink className="size-3 shrink-0" />
            </Link>
          ) : (
            <span className="text-slate-500">-</span>
          ),
      },
      {
        key: "bpmnElement",
        header: t("bpmnElement"),
        width: 140,
        minWidth: 100,
        sortable: true,
        filter: "text",
        value: (item) => item.bpmnElementName ?? "",
        cell: (item) => (
          <span className="truncate">{item.bpmnElementName ?? "-"}</span>
        ),
      },
      {
        key: "frequency",
        header: t("frequency"),
        width: 96,
        minWidth: 80,
        sortable: true,
        filter: "select",
        value: (item) => item.frequency ?? "",
        cell: (item) =>
          item.frequency ? t(`frequencyOptions.${item.frequency}`) : "-",
      },
      {
        key: "status",
        header: t("listStatus"),
        width: 100,
        minWidth: 88,
        sortable: true,
        filter: "select",
        value: (item) => item.processStatus,
        cell: (item) => <StatusBadge status={item.processStatus} />,
      },
      {
        key: "updatedAt",
        header: t("listUpdatedAt"),
        width: 108,
        minWidth: 96,
        sortable: true,
        filter: "text",
        value: (item) => item.updatedAt?.toISOString() ?? "",
        cell: (item) =>
          item.updatedAt
            ? new Intl.DateTimeFormat(undefined, {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
              }).format(new Date(item.updatedAt))
            : "-",
      },
      {
        key: "actions",
        header: t("listActions"),
        width: 108,
        minWidth: 96,
        align: "center",
        cell: (item) => (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-6 px-2 text-[11px]"
            onClick={(event) => {
              event.stopPropagation();
              setDetailNodeId(item.nodeId);
            }}
          >
            <ClipboardList className="mr-1 size-3.5" />
            {t("viewDetail")}
          </Button>
        ),
      },
    ],
    [t],
  );

  useEffect(() => {
    sheetBodyRef.current?.scrollTo({ top: 0, behavior: "instant" });
  }, [detailNodeId]);

  const renderListBody = () => {
    if (!selection) {
      return <EmptyState title={t("selectProcessHint")} className="min-h-[320px]" />;
    }

    if (isLoading) {
      return <LoadingSpinner label={t("loading")} className="min-h-[320px]" />;
    }

    if (error) {
      return (
        <EmptyState
          title={t("loadError")}
          action={
            <Button variant="outline" onClick={() => void refetch()}>
              {t("retry")}
            </Button>
          }
          className="min-h-[320px]"
        />
      );
    }

    return (
      <DataGrid
        title={t("listTitle")}
        count={items?.length ?? 0}
        countSuffix={tc("countUnit")}
        icon
        toolbar={
          <SearchBar
            variant="filter"
            className="w-[220px]"
            value={search}
            onChange={setSearch}
            placeholder={t("listSearchPlaceholder")}
          />
        }
        columns={listColumns}
        data={items ?? []}
        rowKey={(item) => item.attrId}
        storageKey="pams-task-attributes-grid"
        emptyMessage={t("listEmpty")}
        onRowClick={(item) => setDetailNodeId(item.nodeId)}
        fillHeight
      />
    );
  };

  return (
    <ListPageLayout>
      <PageHeader
        title={t("listTitle")}
        description={t("listDesc")}
        icon={ClipboardList}
        actions={
          <PageActions
            onSearch={() => void refetch()}
            showRegister={false}
          />
        }
      />
      <TaskMappingSideLayout
        storageKey="pams-task-mapping-side-panel-width"
        defaultWidth={300}
        splitterLabel={ts("panelResizeHorizontal")}
        companyCode={companyCode}
        businessUnitCode={businessUnitCode}
        onScopeChange={handleScopeChange}
        scopeFilters={scopeFilters}
        selectedProcessId={
          selection?.kind === "process" ? selection.node.nodeId : undefined
        }
        selectedE2eId={
          selection?.kind === "e2e"
            ? selection.process.e2eProcessId
            : undefined
        }
        onSelectProcess={handleSelectProcess}
        onSelectE2e={handleSelectE2e}
      >
        <PageContent bodyClassName="flex min-h-0 flex-1 flex-col gap-1.5">
            {selection ? (
              <div className="shrink-0 rounded-lg border border-slate-200/85 bg-white px-3 py-2 text-xs shadow-sm dark:border-slate-600/65 dark:bg-slate-900/40">
                {selection.kind === "e2e" ? (
                  <>
                    <GitBranch className="mr-1 inline size-3.5 text-sky-600" />
                    <span className="font-medium">{selection.process.name}</span>
                    <span className="ml-2 font-mono text-slate-500">
                      {selection.process.code}
                    </span>
                    <span className="ml-2 text-muted-foreground">E2E</span>
                  </>
                ) : (
                  <>
                    <span className="font-medium">{selection.node.name}</span>
                    <span className="ml-2 font-mono text-slate-500">
                      {selection.node.code}
                    </span>
                    <span className="ml-2 text-muted-foreground">
                      {selection.node.level}
                    </span>
                  </>
                )}
              </div>
            ) : null}
            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
              {renderListBody()}
            </div>
          </PageContent>
      </TaskMappingSideLayout>

      <Sheet
        open={detailNodeId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDetailNodeId(null);
            void refetch();
          }
        }}
      >
        <SheetContent
          className="flex h-full !w-[min(800px,96vw)] !max-w-none flex-col gap-0 overflow-hidden p-0 sm:!max-w-none"
          showCloseButton={false}
        >
          <TaskAttributeSheetProvider>
            <SheetHeader className="shrink-0 gap-1 border-b px-6 py-4">
              <div className="flex items-center justify-between gap-4">
                <SheetTitle className="min-w-0 flex-1 truncate text-base font-semibold">
                  {selectedItem
                    ? `${selectedItem.processCode} — ${selectedItem.processName}`
                    : t("listTitle")}
                </SheetTitle>
                <TaskAttributeSheetHeaderActions />
              </div>
              <SheetDescription className="line-clamp-2">
                {selectedItem?.bpmnElementName
                  ? t("detailSheetDescWithBpmn", {
                      model: selectedItem.bpmnModelName ?? "",
                      task: selectedItem.bpmnElementName,
                    })
                  : t("detailSheetDesc")}
              </SheetDescription>
            </SheetHeader>

            <div
              ref={sheetBodyRef}
              className="min-h-0 flex-1 overflow-y-auto px-6 pb-6 pt-4"
            >
              {detailNodeId !== null && (
                <TaskAttributeForm
                  key={detailNodeId}
                  nodeId={detailNodeId}
                  variant="sheet"
                />
              )}
            </div>
          </TaskAttributeSheetProvider>
        </SheetContent>
      </Sheet>
    </ListPageLayout>
  );
};
