"use client";

import {
  Copy,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { SearchBar } from "@/components/common/SearchBar";
import { StatusBadge } from "@/components/common/StatusBadge";
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
import type { BpmnModelStatus } from "@/types/bpmn";
import type { ProcessNodeTree } from "@/types/process";

/** BPMN 모델 카드/그리드 목록 */
export const BpmnModelList = () => {
  const t = useTranslations("bpmn");
  const ts = useTranslations("status");
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<BpmnModelStatus | "ALL">(
    "ALL",
  );
  const [sort, setSort] = useState<"updated" | "name">("updated");
  const debouncedSearch = useDebounce(search, 300);

  const { data: models, isLoading, error, refetch } = useBpmnList({
    search: debouncedSearch || undefined,
    status: statusFilter === "ALL" ? undefined : statusFilter,
    sort,
  });

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

  if (isLoading) {
    return <LoadingSpinner label={t("loading")} />;
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
      />
    );
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1 size-4" />
          {t("newModel")}
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder={t("searchPlaceholder")}
          className="max-w-sm flex-1"
        />
        <Select
          value={statusFilter}
          onValueChange={(v) => v && setStatusFilter(v as BpmnModelStatus | "ALL")}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder={t("filterStatus")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t("allStatus")}</SelectItem>
            {(["DRAFT", "IN_REVIEW", "APPROVED", "PUBLISHED", "OBSOLETE"] as const).map(
              (s) => (
                <SelectItem key={s} value={s}>
                  {ts(s)}
                </SelectItem>
              ),
            )}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(v) => v && setSort(v as "updated" | "name")}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="updated">{t("sortUpdated")}</SelectItem>
            <SelectItem value="name">{t("sortName")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {!models?.length ? (
        <EmptyState
          title={t("empty")}
          description={t("emptyDesc")}
          action={
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-1 size-4" />
              {t("newModel")}
            </Button>
          }
        />
      ) : (
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
                        {model.processCode} · v{model.version}
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
      )}

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
    </div>
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
              value={nodeId ? String(nodeId) : ""}
              onValueChange={(v) => v && setNodeId(Number(v))}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("selectProcess")} />
              </SelectTrigger>
              <SelectContent>
                {l3Nodes.map((node) => (
                  <SelectItem key={node.nodeId} value={String(node.nodeId)}>
                    {node.code} — {node.name}
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
