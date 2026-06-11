"use client";

import { Code, Pencil, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState, type MouseEvent } from "react";

import { CommonCodeGroupForm } from "@/components/admin/CommonCodeGroupForm";
import { CommonCodeItemForm } from "@/components/admin/CommonCodeItemForm";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DataGrid, type DataGridColumn } from "@/components/common/DataGrid";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import {
  FilterField,
  FilterPanel,
  ListPageBody,
  ListPageLayout,
  PageActions,
  PageContent,
  PageHeader,
} from "@/components/common/layout";
import { SearchBar } from "@/components/common/SearchBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDebounce } from "@/hooks/useDebounce";
import {
  useCommonCodeGroup,
  useCommonCodeGroups,
  useCommonCodeItem,
  useCommonCodeItems,
  useCreateCommonCodeGroup,
  useCreateCommonCodeItem,
  useDeactivateCommonCodeGroup,
  useDeactivateCommonCodeItem,
  useUpdateCommonCodeGroup,
  useUpdateCommonCodeItem,
} from "@/lib/query/hooks/useCommonCode";
import type {
  CommonCodeGroupDto,
  CommonCodeItemDto,
  UpsertCommonCodeGroupDto,
  UpsertCommonCodeItemDto,
} from "@/types/common-code";

type DialogMode =
  | { type: "group-create" }
  | { type: "group-edit"; groupId: number }
  | { type: "item-create"; groupId: number }
  | { type: "item-edit"; codeId: number; groupId: number }
  | null;

/** 공통코드 MAJOR/MINOR 관리 화면 */
export const CommonCodeManagement = () => {
  const t = useTranslations("admin.codes");
  const tc = useTranslations("common");

  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [groupSearch, setGroupSearch] = useState("");
  const [itemSearch, setItemSearch] = useState("");
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<
    { type: "group"; id: number } | { type: "item"; id: number } | null
  >(null);

  const debouncedGroupSearch = useDebounce(groupSearch, 300);
  const debouncedItemSearch = useDebounce(itemSearch, 300);

  const {
    data: groups,
    isLoading: groupsLoading,
    isError: groupsError,
    refetch: refetchGroups,
  } = useCommonCodeGroups({ search: debouncedGroupSearch });

  const {
    data: items,
    isLoading: itemsLoading,
    isError: itemsError,
    refetch: refetchItems,
  } = useCommonCodeItems(selectedGroupId ?? 0, {
    search: debouncedItemSearch,
  });

  const editingGroupId =
    dialogMode?.type === "group-edit" ? dialogMode.groupId : 0;
  const editingItemId = dialogMode?.type === "item-edit" ? dialogMode.codeId : 0;

  const { data: editingGroupDetail } = useCommonCodeGroup(editingGroupId);
  const { data: editingItemDetail } = useCommonCodeItem(editingItemId);

  const createGroupMutation = useCreateCommonCodeGroup();
  const updateGroupMutation = useUpdateCommonCodeGroup(editingGroupId);
  const deactivateGroupMutation = useDeactivateCommonCodeGroup();
  const createItemMutation = useCreateCommonCodeItem(selectedGroupId ?? 0);
  const updateItemMutation = useUpdateCommonCodeItem(editingItemId);
  const deactivateItemMutation = useDeactivateCommonCodeItem();

  const handleGroupSubmit = async (data: UpsertCommonCodeGroupDto) => {
    if (dialogMode?.type === "group-edit") {
      await updateGroupMutation.mutateAsync(data);
    } else {
      const created = await createGroupMutation.mutateAsync(data);
      setSelectedGroupId(created.groupId);
    }

    setDialogMode(null);
  };

  const handleItemSubmit = async (data: UpsertCommonCodeItemDto) => {
    if (dialogMode?.type === "item-edit") {
      await updateItemMutation.mutateAsync(data);
    } else if (selectedGroupId) {
      await createItemMutation.mutateAsync(data);
    }

    setDialogMode(null);
  };

  const handleDeactivate = async () => {
    if (!deactivateTarget) {
      return;
    }

    if (deactivateTarget.type === "group") {
      await deactivateGroupMutation.mutateAsync(deactivateTarget.id);
      if (selectedGroupId === deactivateTarget.id) {
        setSelectedGroupId(null);
      }
    } else {
      await deactivateItemMutation.mutateAsync(deactivateTarget.id);
    }

    setDeactivateTarget(null);
  };

  const dialogOpen = dialogMode !== null;
  const dialogSubmitting =
    createGroupMutation.isPending ||
    updateGroupMutation.isPending ||
    createItemMutation.isPending ||
    updateItemMutation.isPending;

  const dialogTitle =
    dialogMode?.type === "group-create"
      ? t("createGroup")
      : dialogMode?.type === "group-edit"
        ? t("editGroup")
        : dialogMode?.type === "item-create"
          ? t("createItem")
          : dialogMode?.type === "item-edit"
            ? t("editItem")
            : "";

  const groupColumns = useMemo<DataGridColumn<CommonCodeGroupDto>[]>(
    () => [
      {
        key: "groupName",
        header: t("groupName"),
        width: 180,
        minWidth: 140,
        cell: (group) => <span className="font-medium">{group.displayName}</span>,
      },
      {
        key: "groupCode",
        header: t("groupCode"),
        width: 120,
        minWidth: 96,
        cell: (group) => (
          <span className="font-mono text-[11px] text-slate-500">
            {group.groupCode}
          </span>
        ),
      },
      {
        key: "status",
        header: t("status"),
        width: 96,
        minWidth: 80,
        cell: (group) => (
          <Badge variant={group.isActive ? "default" : "secondary"}>
            {group.isActive ? t("active") : t("inactive")}
          </Badge>
        ),
      },
      {
        key: "itemCount",
        header: t("itemCountHeader"),
        width: 88,
        minWidth: 72,
        align: "center",
        cell: (group) => group.itemCount,
      },
      {
        key: "actions",
        header: t("actions"),
        width: 88,
        minWidth: 80,
        align: "center",
        cell: (group) => (
          <div className="flex justify-center gap-1">
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={withStop(() =>
                setDialogMode({
                  type: "group-edit",
                  groupId: group.groupId,
                }),
              )}
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={withStop(() =>
                setDeactivateTarget({ type: "group", id: group.groupId }),
              )}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ),
      },
    ],
    [t],
  );

  const itemColumns = useMemo<DataGridColumn<CommonCodeItemDto>[]>(
    () => [
      {
        key: "code",
        header: t("code"),
        width: 120,
        minWidth: 96,
        cell: (item) => <span className="font-mono text-[11px]">{item.code}</span>,
      },
      {
        key: "codeName",
        header: t("codeName"),
        width: 180,
        minWidth: 140,
        cell: (item) => item.displayName,
      },
      {
        key: "sortOrder",
        header: t("sortOrder"),
        width: 88,
        minWidth: 72,
        align: "center",
        cell: (item) => item.sortOrder,
      },
      {
        key: "status",
        header: t("status"),
        width: 96,
        minWidth: 80,
        cell: (item) => (
          <Badge variant={item.isActive ? "default" : "secondary"}>
            {item.isActive ? t("active") : t("inactive")}
          </Badge>
        ),
      },
      {
        key: "actions",
        header: t("actions"),
        width: 88,
        minWidth: 80,
        align: "center",
        cell: (item) => (
          <div className="flex justify-center gap-1">
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={() =>
                setDialogMode({
                  type: "item-edit",
                  codeId: item.codeId,
                  groupId: item.groupId,
                })
              }
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={() =>
                setDeactivateTarget({ type: "item", id: item.codeId })
              }
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ),
      },
    ],
    [t],
  );

  const renderItemBody = () => {
    if (!selectedGroupId) {
      return <EmptyState title={t("selectGroupHint")} className="min-h-[240px]" />;
    }

    if (itemsLoading) {
      return <LoadingSpinner className="min-h-[240px]" />;
    }

    if (itemsError) {
      return (
        <EmptyState
          title={t("loadError")}
          action={
            <Button variant="outline" onClick={() => refetchItems()}>
              {tc("retry")}
            </Button>
          }
          className="min-h-[240px]"
        />
      );
    }

    return undefined;
  };

  if (groupsLoading) {
    return <LoadingSpinner className="min-h-[480px]" />;
  }

  if (groupsError) {
    return (
      <EmptyState
        title={t("loadError")}
        action={
          <Button variant="outline" onClick={() => refetchGroups()}>
            {tc("retry")}
          </Button>
        }
      />
    );
  }

  return (
    <ListPageLayout>
      <PageHeader
        title={t("title")}
        description={t("pageDescription")}
        icon={Code}
        actions={
          <PageActions
            onSearch={() => {
              void refetchGroups();
              void refetchItems();
            }}
            onRegister={() => setDialogMode({ type: "group-create" })}
            registerLabel={t("newGroup")}
          />
        }
      />
      <ListPageBody
        filter={
          <FilterPanel>
            <FilterField label={t("groupSearchPlaceholder")}>
              <SearchBar
                value={groupSearch}
                onChange={setGroupSearch}
                placeholder={t("groupSearchPlaceholder")}
              />
            </FilterField>
          </FilterPanel>
        }
        content={
          <PageContent>
            <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
              <DataGrid
                title={t("majorTitle")}
                count={groups?.length ?? 0}
                countSuffix={tc("countUnit")}
                icon
                toolbar={
                  <Button
                    size="sm"
                    className="h-7 px-2 text-[11px]"
                    onClick={() => setDialogMode({ type: "group-create" })}
                  >
                    <Plus className="size-3.5" />
                    {t("newGroup")}
                  </Button>
                }
                columns={groupColumns}
                data={groups ?? []}
                rowKey={(group) => group.groupId}
                storageKey="pams-common-code-groups-grid"
                emptyMessage={t("emptyGroups")}
                selectedRowKey={selectedGroupId ?? undefined}
                onRowClick={(group) => setSelectedGroupId(group.groupId)}
              />

              <DataGrid
                title={t("minorTitle")}
                count={items?.length ?? 0}
                countSuffix={tc("countUnit")}
                icon
                toolbar={
                  <div className="flex items-center gap-2">
                    <SearchBar
                      value={itemSearch}
                      onChange={setItemSearch}
                      placeholder={t("itemSearchPlaceholder")}
                      className="w-44"
                    />
                    <Button
                      size="sm"
                      className="h-7 px-2 text-[11px]"
                      disabled={!selectedGroupId}
                      onClick={() =>
                        selectedGroupId &&
                        setDialogMode({
                          type: "item-create",
                          groupId: selectedGroupId,
                        })
                      }
                    >
                      <Plus className="size-3.5" />
                      {t("newItem")}
                    </Button>
                  </div>
                }
                columns={itemColumns}
                data={items ?? []}
                rowKey={(item) => item.codeId}
                storageKey="pams-common-code-items-grid"
                emptyMessage={t("emptyItems")}
                body={renderItemBody()}
              />
            </div>
          </PageContent>
        }
      />

      <Dialog open={dialogOpen} onOpenChange={(open) => !open && setDialogMode(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
          </DialogHeader>

          {dialogMode?.type === "group-create" && (
            <CommonCodeGroupForm key="group-create" onSubmit={handleGroupSubmit} />
          )}
          {dialogMode?.type === "group-edit" && editingGroupDetail && (
            <CommonCodeGroupForm
              key={`group-edit-${editingGroupDetail.groupId}`}
              initial={editingGroupDetail}
              onSubmit={handleGroupSubmit}
            />
          )}
          {dialogMode?.type === "item-create" && selectedGroupId && (
            <CommonCodeItemForm
              key={`item-create-${selectedGroupId}`}
              groupId={selectedGroupId}
              onSubmit={handleItemSubmit}
            />
          )}
          {dialogMode?.type === "item-edit" && editingItemDetail && (
            <CommonCodeItemForm
              key={`item-edit-${editingItemDetail.codeId}`}
              groupId={editingItemDetail.groupId}
              initial={editingItemDetail}
              onSubmit={handleItemSubmit}
            />
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogMode(null)}>
              {tc("cancel")}
            </Button>
            {dialogMode?.type.startsWith("group") ? (
              <Button
                type="submit"
                form="common-code-group-form"
                disabled={dialogSubmitting}
              >
                {tc("save")}
              </Button>
            ) : (
              <Button
                type="submit"
                form="common-code-item-form"
                disabled={dialogSubmitting}
              >
                {tc("save")}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deactivateTarget !== null}
        onOpenChange={(open) => !open && setDeactivateTarget(null)}
        title={t("deactivateTitle")}
        description={t("deactivateDesc")}
        confirmLabel={t("deactivateConfirm")}
        variant="destructive"
        loading={
          deactivateGroupMutation.isPending || deactivateItemMutation.isPending
        }
        onConfirm={handleDeactivate}
      />
    </ListPageLayout>
  );
};

const withStop =
  (handler: () => void) => (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    handler();
  };
