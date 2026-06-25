"use client";

import {
  Copy,
  GitBranch,
  MoreHorizontal,
  Pencil,
  Trash2,
  Workflow,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";

import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import {
  ContentPanel,
  ListPageLayout,
  PageActions,
  PageContent,
  PageHeader,
} from "@/components/common/layout";
import { SearchBar } from "@/components/common/SearchBar";
import { StatusBadge } from "@/components/common/StatusBadge";
import { TaskMappingSideLayout } from "@/components/metadata/TaskMappingSideLayout";
import { useProcessScopeParams } from "@/components/process/ProcessScopeFilter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDebounce } from "@/hooks/useDebounce";
import { Link, useRouter } from "@/lib/i18n/navigation";
import {
  useBpmnList,
  useCreateBpmn,
  useDeleteBpmn,
  useDuplicateBpmn,
} from "@/lib/query/hooks/useBpmn";
import { useProcessTree } from "@/lib/query/hooks/useProcess";
import type { BpmnModelKind, BpmnModelStatus } from "@/types/bpmn";
import type { E2eProcessDto } from "@/types/e2e-process";
import type { ProcessNodeTree } from "@/types/process";

type BpmnListSelection =
  | { kind: "process"; node: ProcessNodeTree }
  | { kind: "e2e"; process: E2eProcessDto };

/** BPMN 모델 카드/그리드 목록 */
export const BpmnModelList = () => {
  const t = useTranslations("bpmn");
  const tsMap = useTranslations("systemMapping");
  const tc = useTranslations("common");
  const ts = useTranslations("status");
  const router = useRouter();
  const { companyCode, businessUnitCode, setScope, filters: scopeFilters } =
    useProcessScopeParams();
  const [selection, setSelection] = useState<BpmnListSelection | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<BpmnModelStatus | "ALL">(
    "ALL",
  );
  const [modelKindFilter, setModelKindFilter] = useState<BpmnModelKind | "ALL">(
    "ALL",
  );
  const [sort, setSort] = useState<"updated" | "name">("updated");
  const debouncedSearch = useDebounce(search, 300);
  const statusFilterLabel =
    statusFilter === "ALL" ? t("allStatus") : ts(statusFilter);
  const sortLabel = sort === "updated" ? t("sortUpdated") : t("sortName");

  const modelKindFilterLabel =
    modelKindFilter === "ALL"
      ? t("allModelKinds")
      : modelKindFilter === "E2E"
        ? t("modelKindE2e")
        : t("modelKindL3");

  const listFilters = useMemo(
    () => ({
      isCurrent: true,
      search: debouncedSearch || undefined,
      status: statusFilter === "ALL" ? undefined : statusFilter,
      modelKind: modelKindFilter === "ALL" ? undefined : modelKindFilter,
      sort,
      companyCode: companyCode || undefined,
      businessUnitCode: businessUnitCode || undefined,
      nodeId: selection?.kind === "process" ? selection.node.nodeId : undefined,
      e2eProcessId:
        selection?.kind === "e2e" ? selection.process.e2eProcessId : undefined,
    }),
    [
      businessUnitCode,
      companyCode,
      debouncedSearch,
      modelKindFilter,
      selection,
      sort,
      statusFilter,
    ],
  );

  const { data: models, isLoading, error, refetch } = useBpmnList(listFilters);

  const deleteMutation = useDeleteBpmn();
  const duplicateMutation = useDuplicateBpmn();
  const createMutation = useCreateBpmn();

  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [duplicateTarget, setDuplicateTarget] = useState<{
    modelId: number;
    defaultName: string;
  } | null>(null);
  const [duplicateName, setDuplicateName] = useState("");

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

  const listToolbar = (
    <div className="flex flex-wrap items-center gap-2">
      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder={t("searchPlaceholder")}
        className="w-48"
      />
      <Select
        value={statusFilter}
        onValueChange={(v) => v && setStatusFilter(v as BpmnModelStatus | "ALL")}
      >
        <SelectTrigger variant="filter" className="w-[120px]">
          <SelectValue placeholder={t("filterStatus")}>
            {statusFilterLabel}
          </SelectValue>
        </SelectTrigger>
        <SelectContent variant="filter">
          <SelectItem variant="filter" value="ALL">
            {t("allStatus")}
          </SelectItem>
          {(
            ["DRAFT", "IN_REVIEW", "APPROVED", "PUBLISHED", "OBSOLETE"] as const
          ).map((s) => (
            <SelectItem variant="filter" key={s} value={s}>
              {ts(s)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={modelKindFilter}
        onValueChange={(v) =>
          v && setModelKindFilter(v as BpmnModelKind | "ALL")
        }
      >
        <SelectTrigger variant="filter" className="w-[120px]">
          <SelectValue placeholder={t("filterModelKind")}>
            {modelKindFilterLabel}
          </SelectValue>
        </SelectTrigger>
        <SelectContent variant="filter">
          <SelectItem variant="filter" value="ALL">
            {t("allModelKinds")}
          </SelectItem>
          <SelectItem variant="filter" value="L3_PROCESS">
            {t("modelKindL3")}
          </SelectItem>
          <SelectItem variant="filter" value="E2E">
            {t("modelKindE2e")}
          </SelectItem>
        </SelectContent>
      </Select>
      <Select
        value={sort}
        onValueChange={(v) => v && setSort(v as "updated" | "name")}
      >
        <SelectTrigger variant="filter" className="w-[120px]">
          <SelectValue>{sortLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent variant="filter">
          <SelectItem variant="filter" value="updated">
            {t("sortUpdated")}
          </SelectItem>
          <SelectItem variant="filter" value="name">
            {t("sortName")}
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

  const renderModelList = () => {
    if (isLoading) {
      return <LoadingSpinner label={t("loading")} className="min-h-[320px]" />;
    }

    if (error) {
      return (
        <EmptyState
          title={t("loadError")}
          action={
            <Button variant="outline" onClick={() => refetch()}>
              {t("retry")}
            </Button>
          }
          className="min-h-[320px]"
        />
      );
    }

    if (!models?.length) {
      return (
        <EmptyState
          title={t("empty")}
          description={t("emptyDesc")}
          action={
            <PageActions
              showSearch={false}
              onRegister={() => setCreateOpen(true)}
              registerLabel={t("newModel")}
            />
          }
          className="min-h-[320px]"
        />
      );
    }

    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {models.map((model) => (
          <Card key={model.modelId} className="overflow-hidden">
            <Link href={`/bpmn/${model.modelId}`}>
              <div className="pams-bpmn-thumbnail flex h-36 items-center justify-center bg-muted/30 p-2">
                {model.svgContent ? (
                  <div
                    className="h-full w-full [&>svg]:h-full [&>svg]:w-full"
                    dangerouslySetInnerHTML={{ __html: model.svgContent }}
                  />
                ) : (
                  <span className="text-sm text-muted-foreground">
                    {t("noThumbnail")}
                  </span>
                )}
              </div>
            </Link>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <CardContent className="p-0">
                    <p className="truncate font-medium">{model.modelName}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {model.modelKind === "E2E"
                        ? `${model.e2eProcessCode ?? "E2E"} · v${model.version}`
                        : `${model.processCode} · v${model.version}`}
                    </p>
                  </CardContent>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button variant="ghost" size="icon-sm">
                        <MoreHorizontal className="size-4" />
                      </Button>
                    }
                  />
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => router.push(`/bpmn/${model.modelId}`)}
                    >
                      <Pencil className="mr-2 size-4" />
                      {t("edit")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        setDuplicateTarget({
                          modelId: model.modelId,
                          defaultName: `${model.modelName} (copy)`,
                        });
                        setDuplicateName(`${model.modelName} (copy)`);
                      }}
                    >
                      <Copy className="mr-2 size-4" />
                      {t("duplicate")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => setDeleteTarget(model.modelId)}
                    >
                      <Trash2 className="mr-2 size-4" />
                      {t("delete")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardFooter className="justify-between pt-0">
              <StatusBadge status={model.status} />
              <span className="text-xs text-muted-foreground">
                {model.updatedAt
                  ? new Date(model.updatedAt).toLocaleDateString()
                  : new Date(model.createdAt).toLocaleDateString()}
              </span>
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <ListPageLayout>
      <PageHeader
        title={t("title")}
        description={t("listDesc")}
        icon={Workflow}
        actions={
          <PageActions
            onSearch={() => void refetch()}
            onRegister={() => setCreateOpen(true)}
            registerLabel={t("newModel")}
          />
        }
      />
      <TaskMappingSideLayout
        storageKey="pams-bpmn-list-filter-panel-width"
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
            <ContentPanel
              title={t("title")}
              count={models?.length ?? 0}
              countSuffix={tc("countUnit")}
              icon
              toolbar={listToolbar}
              bodyClassName="p-4"
            >
              {renderModelList()}
            </ContentPanel>
          </div>
        </PageContent>
      </TaskMappingSideLayout>

      <CreateBpmnDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        loading={createMutation.isPending}
        onSubmit={async (payload) => {
          const created = await createMutation.mutateAsync(payload);
          setCreateOpen(false);
          router.push(`/bpmn/${created.modelId}`);
        }}
      />

      <Dialog
        open={!!duplicateTarget}
        onOpenChange={(open) => !open && setDuplicateTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("duplicate")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="dup-name">{t("modelName")}</Label>
            <Input
              id="dup-name"
              value={duplicateName}
              onChange={(e) => setDuplicateName(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              onClick={async () => {
                if (!duplicateTarget) return;
                const created = await duplicateMutation.mutateAsync({
                  modelId: duplicateTarget.modelId,
                  modelName: duplicateName,
                });
                setDuplicateTarget(null);
                router.push(`/bpmn/${created.modelId}`);
              }}
              disabled={!duplicateName.trim() || duplicateMutation.isPending}
            >
              {t("duplicate")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t("deleteConfirmTitle")}
        description={t("deleteConfirmDesc")}
        variant="destructive"
        loading={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget !== null) {
            deleteMutation.mutate(deleteTarget, {
              onSuccess: () => setDeleteTarget(null),
            });
          }
        }}
      />
    </ListPageLayout>
  );
};

type CreateBpmnDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading?: boolean;
  onSubmit: (payload: { nodeId: number; modelName: string }) => Promise<void>;
};

/** 새 BPMN 모델 생성 다이얼로그 */
const CreateBpmnDialog = ({
  open,
  onOpenChange,
  loading,
  onSubmit,
}: CreateBpmnDialogProps) => {
  const t = useTranslations("bpmn");
  const { data: tree } = useProcessTree();
  const [modelName, setModelName] = useState("");
  const [nodeId, setNodeId] = useState<number | null>(null);

  const l3Nodes = useMemo(() => flattenL3Nodes(tree ?? []), [tree]);

  const processSelectItems = useMemo(
    () =>
      l3Nodes.map((node) => ({
        value: String(node.nodeId),
        label: `${node.code} — ${node.name}`,
      })),
    [l3Nodes],
  );

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setModelName("");
      setNodeId(null);
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("newModel")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bpmn-name">{t("modelName")}</Label>
            <Input
              id="bpmn-name"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              placeholder={t("modelNamePlaceholder")}
            />
          </div>
          <div className="space-y-2">
            <Label>{t("linkedProcess")}</Label>
            <Select
              value={nodeId === null ? undefined : String(nodeId)}
              onValueChange={(v) => {
                if (!v) {
                  return;
                }

                const nextNode =
                  l3Nodes.find((node) => String(node.nodeId) === v) ?? null;
                setNodeId(Number(v));
                if (nextNode) {
                  setModelName(nextNode.name);
                }
              }}
            >
              <SelectTrigger variant="filter">
                <SelectValue placeholder={t("selectProcess")} />
              </SelectTrigger>
              <SelectContent variant="filter" items={processSelectItems}>
                {processSelectItems.map((item) => (
                  <SelectItem variant="filter" key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("cancel")}
          </Button>
          <Button
            disabled={!modelName.trim() || !nodeId || loading}
            onClick={() => {
              if (nodeId) {
                void onSubmit({ nodeId, modelName: modelName.trim() });
              }
            }}
          >
            {t("create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const flattenL3Nodes = (nodes: ProcessNodeTree[]): ProcessNodeTree[] => {
  const result: ProcessNodeTree[] = [];
  const walk = (items: ProcessNodeTree[]) => {
    for (const node of items) {
      if (node.level === "L3") {
        result.push(node);
      }
      if (node.children?.length) {
        walk(node.children);
      }
    }
  };
  walk(nodes);
  return result;
};
