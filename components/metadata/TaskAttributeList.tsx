"use client";

import { ClipboardList, GitBranch } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { EmptyState } from "@/components/pams/empty-state";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import {
  ListPageLayout,
  PageActions,
  PageContent,
  PageHeader,
} from "@/components/common/layout";
import {
  TaskAttributeForm,
  TaskAttributeSheetHeaderActions,
  TaskAttributeSheetProvider,
} from "@/components/metadata/TaskAttributeForm";
import { TaskMappingSideLayout } from "@/components/metadata/TaskMappingSideLayout";
import { EditableDataGrid } from "@/components/pams/editable-data-grid";
import { useProcessScopeParams } from "@/components/process/ProcessScopeFilter";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useNavigationGuardStore } from "@/lib/store/navigation-guard.store";
import {
  useBatchSaveTaskAttributes,
  useTaskAttributeList,
} from "@/lib/query/hooks/useMetadata";
import { useSystems } from "@/lib/query/hooks/useSystems";
import type {
  EditableColumn,
  EditableGridSavePayload,
  TaskGridRow,
} from "@/types/editable-data-grid";
import type { TaskAttributeListItem } from "@/types/metadata";
import type { E2eProcessDto } from "@/types/e2e-process";
import type { ProcessNodeTree } from "@/types/process";

type TaskAttributeSelection =
  | { kind: "process"; node: ProcessNodeTree }
  | { kind: "e2e"; process: E2eProcessDto };

const toTaskGridRow = (item: TaskAttributeListItem): TaskGridRow => ({
  id: String(item.nodeId),
  nodeId: item.nodeId,
  attrId: item.attrId,
  processCode: item.processCode,
  processName: item.processName,
  definition: item.definition,
  purpose: item.purpose,
  inputDeliverable: item.inputDeliverable,
  outputDeliverable: item.outputDeliverable,
  ownerOrgId: null,
  linkedSystemId: null,
  version: item.version,
  updatedAt: item.updatedAt
    ? typeof item.updatedAt === "string"
      ? item.updatedAt
      : item.updatedAt.toISOString()
    : null,
});

/** BPMN Task 속성 — 프로세스 트리 + 인라인 편집 그리드 */
export const TaskAttributeList = () => {
  const t = useTranslations("metadata");
  const te = useTranslations("editableGrid");
  const tsMap = useTranslations("systemMapping");
  const { companyCode, businessUnitCode, setScope, filters: scopeFilters } =
    useProcessScopeParams();
  const [selection, setSelection] = useState<TaskAttributeSelection | null>(null);
  const [pendingSelection, setPendingSelection] =
    useState<TaskAttributeSelection | null>(null);
  const [pendingScope, setPendingScope] = useState<Pick<
    import("@/types/process").ProcessFilters,
    "companyCode" | "businessUnitCode"
  > | null>(null);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [detailNodeId, setDetailNodeId] = useState<number | null>(null);
  const [gridDirty, setGridDirty] = useState(false);
  const sheetBodyRef = useRef<HTMLDivElement>(null);

  const { data: systems } = useSystems({ isActive: true });
  const batchSave = useBatchSaveTaskAttributes();
  const setBlocking = useNavigationGuardStore((s) => s.setBlocking);

  const handleScopeChange = useCallback(
    (scope: Parameters<typeof setScope>[0]) => {
      if (gridDirty) {
        setPendingScope(scope);
        setLeaveDialogOpen(true);
        return;
      }
      setSelection(null);
      setScope(scope);
    },
    [gridDirty, setScope],
  );

  const applySelection = useCallback((next: TaskAttributeSelection | null) => {
    setSelection(next);
    setPendingSelection(null);
    setLeaveDialogOpen(false);
  }, []);

  const requestSelectionChange = useCallback(
    (next: TaskAttributeSelection | null) => {
      if (gridDirty) {
        setPendingSelection(next);
        setLeaveDialogOpen(true);
        return;
      }
      applySelection(next);
    },
    [applySelection, gridDirty],
  );

  const handleSelectProcess = useCallback(
    (node: ProcessNodeTree) => {
      requestSelectionChange({ kind: "process", node });
    },
    [requestSelectionChange],
  );

  const handleSelectE2e = useCallback(
    (process: E2eProcessDto) => {
      requestSelectionChange({ kind: "e2e", process });
    },
    [requestSelectionChange],
  );

  const filters = useMemo(
    () => ({
      nodeId: selection?.kind === "process" ? selection.node.nodeId : undefined,
      e2eProcessId:
        selection?.kind === "e2e" ? selection.process.e2eProcessId : undefined,
    }),
    [selection],
  );

  const {
    data: items,
    isLoading,
    error,
    refetch,
  } = useTaskAttributeList(filters, {
    enabled: Boolean(selection),
  });

  const gridData = useMemo(
    () => (items ?? []).map(toTaskGridRow),
    [items],
  );

  const systemOptions = useMemo(
    () =>
      (systems ?? []).map((sys) => ({
        label: sys.systemName,
        value: String(sys.systemId),
      })),
    [systems],
  );

  const columns = useMemo<EditableColumn<TaskGridRow>[]>(
    () => [
      {
        key: "_select",
        header: "",
        width: 40,
      },
      {
        key: "processCode",
        header: t("processCode"),
        width: 120,
        freeze: "left",
        mono: true,
        align: "center",
        sortable: true,
        filter: "text",
        accessor: (row) => row.processCode,
      },
      {
        key: "processName",
        header: t("processName"),
        editor: "text",
        required: true,
        width: 160,
        freeze: "left",
        sortable: true,
        filter: "text",
        accessor: (row) => row.processName,
      },
      {
        key: "definition",
        header: t("definition"),
        editor: "textarea",
        width: 350,
        sortable: true,
        filter: "text",
        accessor: (row) => row.definition ?? "",
        required: true,
        validate: (value) =>
          value == null || String(value).trim() === ""
            ? t("definitionRequired")
            : null,
      },
      {
        key: "inputDeliverable",
        header: t("inputInfo"),
        editor: "textarea",
        width: 150,
        sortable: true,
        filter: "text",
        accessor: (row) => row.inputDeliverable ?? "",
      },
      {
        key: "outputDeliverable",
        header: t("outputInfo"),
        editor: "textarea",
        width: 150,
        sortable: true,
        filter: "text",
        accessor: (row) => row.outputDeliverable ?? "",
      },
      {
        key: "ownerOrgId",
        header: te("ownerOrg"),
        editor: "combobox",
        options: [],
        width: 140,
        accessor: (row) => row.ownerOrgId ?? "",
      },
      {
        key: "linkedSystemId",
        header: te("linkedSystem"),
        editor: "combobox",
        options: systemOptions,
        width: 140,
        align: "center",
        accessor: (row) => row.linkedSystemId ?? "",
        parsePaste: (raw) => {
          const value = raw.trim();
          if (!value) {
            return null;
          }
          const match = systemOptions.find(
            (opt) =>
              opt.value === value ||
              opt.label.toLowerCase() === value.toLowerCase(),
          );
          if (!match) {
            throw new Error("invalid system");
          }
          return match.value;
        },
      },
      {
        key: "version",
        header: te("version"),
        width: 80,
        align: "center",
        mono: true,
        accessor: (row) => row.version ?? "",
      },
      {
        key: "updatedAt",
        header: t("listUpdatedAt"),
        width: 108,
        align: "center",
        sortable: true,
        accessor: (row) => row.updatedAt ?? "",
      },
      {
        key: "_expand",
        header: "",
        width: 20,
        action: "expand",
      },
    ],
    [t, te, systemOptions],
  );

  const selectedItem = useMemo(
    () => items?.find((item) => item.nodeId === detailNodeId) ?? null,
    [detailNodeId, items],
  );

  const selectionLabel = useMemo(() => {
    if (!selection) {
      return null;
    }
    if (selection.kind === "e2e") {
      return `${selection.process.name} (${selection.process.code})`;
    }
    return `${selection.node.name} (${selection.node.code})`;
  }, [selection]);

  useEffect(() => {
    setBlocking(gridDirty);
    return () => setBlocking(false);
  }, [gridDirty, setBlocking]);

  useEffect(() => {
    sheetBodyRef.current?.scrollTo({ top: 0, behavior: "instant" });
  }, [detailNodeId]);

  const handleSave = async (payload: EditableGridSavePayload<TaskGridRow>) => {
    const result = await batchSave.mutateAsync({
      updates: payload.updates.map((item) => ({
        id: item.id,
        changedFields: item.changedFields,
      })),
      creates: payload.creates.map((item) => ({
        tempId: item.tempId,
        nodeId: item.nodeId,
        definition: item.definition,
        purpose: item.purpose,
        processName: item.processName,
      })),
    });
    await refetch();
    return result;
  };

  const handleDiscardAndLeave = () => {
    setGridDirty(false);
    if (pendingScope) {
      setSelection(null);
      setScope(pendingScope);
      setPendingScope(null);
      setLeaveDialogOpen(false);
      return;
    }
    if (pendingSelection !== null) {
      applySelection(pendingSelection);
      return;
    }
    setLeaveDialogOpen(false);
  };

  const renderRightPanel = () => {
    if (!selection) {
      return (
        <EmptyState
          title={t("selectProcessHint")}
          className="min-h-[320px] flex-1"
        />
      );
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
      <EditableDataGrid
        columns={columns}
        data={gridData}
        onSave={handleSave}
        onRowExpand={(row) => setDetailNodeId(row.nodeId)}
        enableAddRow={false}
        toolbar={{
          globalSearch: true,
          columnFilter: true,
        }}
        emptyMessage={t("listEmpty")}
        fillHeight
        countLabel={selectionLabel ?? t("listTitle")}
        onDirtyChange={setGridDirty}
        featureFlags={{
          clipboard: true,
          fillDown: true,
          rangeSelect: true,
          undoRedo: true,
        }}
        storageKey="pams-task-attributes-editable-grid"
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
          <PageActions onSearch={() => void refetch()} showRegister={false} />
        }
      />
      <TaskMappingSideLayout
        storageKey="pams-task-mapping-side-panel-width"
        defaultWidth={300}
        splitterLabel={tsMap("panelResizeHorizontal")}
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
            <div className="shrink-0 rounded-lg border bg-card px-3 py-2 text-sm shadow-sm">
              {selection.kind === "e2e" ? (
                <>
                  <GitBranch className="mr-1 inline size-3.5 text-primary" />
                  <span className="font-medium">{selection.process.name}</span>
                  <span className="ml-2 font-mono text-muted-foreground">
                    {selection.process.code}
                  </span>
                  <span className="ml-2 text-muted-foreground">E2E</span>
                </>
              ) : (
                <>
                  <span className="font-medium">{selection.node.name}</span>
                  <span className="ml-2 font-mono text-muted-foreground">
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
            {renderRightPanel()}
          </div>
        </PageContent>
      </TaskMappingSideLayout>

      <Dialog open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{te("leaveTitle")}</DialogTitle>
            <DialogDescription>{te("leaveDesc")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setLeaveDialogOpen(false)}
            >
              {t("cancel")}
            </Button>
            <Button type="button" variant="outline" onClick={handleDiscardAndLeave}>
              {te("leaveWithoutSave")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
