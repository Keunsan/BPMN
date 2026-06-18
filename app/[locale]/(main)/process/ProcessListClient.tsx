"use client";

import { Network } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import {
  ContentPanel,
  ListPageBody,
  ListPageLayout,
  PageActions,
  PageContent,
  PageHeader,
} from "@/components/common/layout";
import { ProcessDetail } from "@/components/process/ProcessDetail";
import { ProcessForm } from "@/components/process/ProcessForm";
import {
  ProcessScopeFilter,
  useProcessScopeParams,
} from "@/components/process/ProcessScopeFilter";
import { ProcessTree } from "@/components/process/ProcessTree";
import { E2eProcessTreeSection } from "@/components/e2e-process/E2eProcessTreeSection";
import { E2eProcessDetail } from "@/components/e2e-process/E2eProcessDetail";
import { E2eProcessForm } from "@/components/e2e-process/E2eProcessForm";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { ProcessNodeDto, ProcessNodeTree } from "@/types/process";
import type { E2eProcessDto } from "@/types/e2e-process";

type ProcessSheetState =
  | { type: "detail"; node: ProcessNodeTree | ProcessNodeDto }
  | { type: "create"; parentId: number | null }
  | { type: "edit"; node: ProcessNodeDto };

type E2eSheetState =
  | { type: "detail"; process: E2eProcessDto }
  | { type: "create" }
  | { type: "edit"; process: E2eProcessDto };

/** 프로세스 트리에서 선택한 노드를 오른쪽 상세 패널로 표시한다. */
export const ProcessListClient = () => {
  const t = useTranslations("process");
  const tm = useTranslations("menu");
  const { companyCode, businessUnitCode, setScope, filters: scopeFilters } =
    useProcessScopeParams();
  const [sheetState, setSheetState] = useState<ProcessSheetState | null>(null);
  const [e2eSheet, setE2eSheet] = useState<E2eSheetState | null>(null);
  const [selectedE2eId, setSelectedE2eId] = useState<number | undefined>();
  const selectedNode =
    sheetState?.type === "detail" || sheetState?.type === "edit"
      ? sheetState.node
      : null;

  return (
    <ListPageLayout>
      <PageHeader
        title={tm("processMap")}
        description={t("searchPlaceholder")}
        icon={Network}
        actions={
          <PageActions
            showSearch={false}
            onRegister={() => setSheetState({ type: "create", parentId: null })}
            registerLabel={t("new")}
          />
        }
      />
      <ListPageBody
        filterStorageKey="pams-process-list-filter-panel-width"
        filter={
          <ProcessScopeFilter
            companyCode={companyCode}
            businessUnitCode={businessUnitCode}
            onScopeChange={setScope}
          />
        }
        content={
          <PageContent>
            <ContentPanel title={tm("processMap")} icon bodyClassName="p-4">
              <ProcessTree
                selectedId={selectedNode?.nodeId}
                scopeFilters={scopeFilters}
                onSelect={(node) => {
                  setSelectedE2eId(undefined);
                  setE2eSheet(null);
                  setSheetState({ type: "detail", node });
                }}
                onCreate={(parentId = null) => setSheetState({ type: "create", parentId })}
              />
              <E2eProcessTreeSection
                selectedId={selectedE2eId}
                onSelect={(process) => {
                  setSheetState(null);
                  setSelectedE2eId(process.e2eProcessId);
                  setE2eSheet({ type: "detail", process });
                }}
              />
            </ContentPanel>
          </PageContent>
        }
      />

      <Sheet
        open={Boolean(sheetState || e2eSheet)}
        onOpenChange={(open) => {
          if (!open) {
            setSheetState(null);
            setE2eSheet(null);
          }
        }}
      >
        <SheetContent
          side="right"
          className="w-[min(768px,calc(100vw-2rem))] gap-0 p-0 data-[side=right]:w-[min(768px,calc(100vw-2rem))] data-[side=right]:sm:max-w-none"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>
              {sheetState?.type === "create"
                ? t("newProcess")
                : sheetState?.type === "edit"
                  ? t("editProcess")
                : selectedNode?.name ?? t("detailSheetTitle")}
            </SheetTitle>
            <SheetDescription>
              {sheetState?.type === "create"
                ? t("createSheetDesc")
                : sheetState?.type === "edit"
                  ? t("editSheetDesc")
                : t("detailSheetDesc")}
            </SheetDescription>
          </SheetHeader>
          {sheetState?.type === "detail" && selectedNode && (
            <ProcessDetail
              nodeId={selectedNode.nodeId}
              showTree={false}
              onEdit={(node) => setSheetState({ type: "edit", node })}
            />
          )}
          {sheetState?.type === "create" && (
            <div className="h-full overflow-y-auto">
              <ProcessForm
                mode="create"
                parentId={sheetState.parentId}
                layout="panel"
                onCancel={() => setSheetState(null)}
                onSuccess={(node) => setSheetState({ type: "detail", node })}
              />
            </div>
          )}
          {sheetState?.type === "edit" && (
            <div className="h-full overflow-y-auto">
              <ProcessForm
                mode="edit"
                initialData={sheetState.node}
                layout="panel"
                onCancel={() =>
                  setSheetState({ type: "detail", node: sheetState.node })
                }
                onSuccess={(node) => setSheetState({ type: "detail", node })}
              />
            </div>
          )}
          {e2eSheet?.type === "detail" && (
            <E2eProcessDetail
              e2eProcessId={e2eSheet.process.e2eProcessId}
              onEdit={(process) => setE2eSheet({ type: "edit", process })}
            />
          )}
          {e2eSheet?.type === "create" && (
            <E2eProcessForm
              mode="create"
              onCancel={() => setE2eSheet(null)}
              onSuccess={(process) => setE2eSheet({ type: "detail", process })}
            />
          )}
          {e2eSheet?.type === "edit" && (
            <E2eProcessForm
              mode="edit"
              initialData={e2eSheet.process}
              onCancel={() =>
                setE2eSheet({ type: "detail", process: e2eSheet.process })
              }
              onSuccess={(process) => setE2eSheet({ type: "detail", process })}
            />
          )}
        </SheetContent>
      </Sheet>
    </ListPageLayout>
  );
};
