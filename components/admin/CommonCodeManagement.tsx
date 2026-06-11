"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState, type MouseEvent } from "react";

import { CommonCodeGroupForm } from "@/components/admin/CommonCodeGroupForm";
import { CommonCodeItemForm } from "@/components/admin/CommonCodeItemForm";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
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
import { cn } from "@/lib/utils";
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

  const selectedGroup = useMemo(
    () => groups?.find((group) => group.groupId === selectedGroupId) ?? null,
    [groups, selectedGroupId],
  );

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
    <div className="flex h-full min-h-0 flex-col p-6">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("pageDescription")}
        </p>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[520px_minmax(0,1fr)]">
        <section className="flex min-h-0 flex-col rounded-lg border bg-card">
          <div className="flex items-center justify-between gap-2 border-b p-4">
            <div>
              <h2 className="font-semibold">
                {t("majorTitle")}
                <span className="ml-1 text-sm text-muted-foreground">
                  ({groups?.length ?? 0})
                </span>
              </h2>
              <p className="text-xs text-muted-foreground">{t("majorDesc")}</p>
            </div>
            <Button
              size="sm"
              onClick={() => setDialogMode({ type: "group-create" })}
            >
              <Plus className="size-4" />
              {t("newGroup")}
            </Button>
          </div>

          <div className="border-b p-4">
            <SearchBar
              value={groupSearch}
              onChange={setGroupSearch}
              placeholder={t("groupSearchPlaceholder")}
            />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {!groups?.length ? (
              <EmptyState title={t("emptyGroups")} className="py-8" />
            ) : (
              <div className="overflow-hidden rounded-md border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">
                        {t("groupName")}
                      </th>
                      <th className="px-3 py-2 text-left font-medium">
                        {t("groupCode")}
                      </th>
                      <th className="px-3 py-2 text-left font-medium">
                        {t("status")}
                      </th>
                      <th className="px-3 py-2 text-left font-medium">
                        {t("itemCountHeader")}
                      </th>
                      <th className="px-3 py-2 text-right font-medium">
                        {t("actions")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {groups.map((group) => (
                      <GroupRow
                        key={group.groupId}
                        group={group}
                        selected={selectedGroupId === group.groupId}
                        onSelect={() => setSelectedGroupId(group.groupId)}
                        onEdit={() =>
                          setDialogMode({
                            type: "group-edit",
                            groupId: group.groupId,
                          })
                        }
                        onDeactivate={() =>
                          setDeactivateTarget({ type: "group", id: group.groupId })
                        }
                        activeLabel={t("active")}
                        inactiveLabel={t("inactive")}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        <section className="flex min-h-0 flex-col rounded-lg border bg-card">
          <div className="flex items-center justify-between gap-2 border-b p-4">
            <div>
              <h2 className="font-semibold">{t("minorTitle")}</h2>
              <p className="text-xs text-muted-foreground">
                {selectedGroup
                  ? t("minorDescWithGroup", {
                      code: selectedGroup.groupCode,
                      name: selectedGroup.displayName,
                    })
                  : t("minorDesc")}
              </p>
            </div>
            <Button
              size="sm"
              disabled={!selectedGroupId}
              onClick={() =>
                selectedGroupId &&
                setDialogMode({ type: "item-create", groupId: selectedGroupId })
              }
            >
              <Plus className="size-4" />
              {t("newItem")}
            </Button>
          </div>

          {!selectedGroupId ? (
            <div className="flex flex-1 items-center justify-center p-6">
              <EmptyState title={t("selectGroupHint")} />
            </div>
          ) : (
            <>
              <div className="border-b p-4">
                <SearchBar
                  value={itemSearch}
                  onChange={setItemSearch}
                  placeholder={t("itemSearchPlaceholder")}
                />
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-4">
                {itemsLoading ? (
                  <LoadingSpinner />
                ) : itemsError ? (
                  <EmptyState
                    title={t("loadError")}
                    action={
                      <Button variant="outline" onClick={() => refetchItems()}>
                        {tc("retry")}
                      </Button>
                    }
                  />
                ) : !items?.length ? (
                  <EmptyState title={t("emptyItems")} />
                ) : (
                  <div className="overflow-hidden rounded-md border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium">{t("code")}</th>
                          <th className="px-3 py-2 text-left font-medium">{t("codeName")}</th>
                          <th className="px-3 py-2 text-left font-medium">{t("sortOrder")}</th>
                          <th className="px-3 py-2 text-left font-medium">{t("status")}</th>
                          <th className="px-3 py-2 text-right font-medium">{t("actions")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item) => (
                          <ItemRow
                            key={item.codeId}
                            item={item}
                            activeLabel={t("active")}
                            inactiveLabel={t("inactive")}
                            onEdit={() =>
                              setDialogMode({
                                type: "item-edit",
                                codeId: item.codeId,
                                groupId: item.groupId,
                              })
                            }
                            onDeactivate={() =>
                              setDeactivateTarget({ type: "item", id: item.codeId })
                            }
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </div>

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
    </div>
  );
};

type GroupListItemProps = {
  group: CommonCodeGroupDto;
  selected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDeactivate: () => void;
  activeLabel: string;
  inactiveLabel: string;
};

const GroupRow = ({
  group,
  selected,
  onSelect,
  onEdit,
  onDeactivate,
  activeLabel,
  inactiveLabel,
}: GroupListItemProps) => (
  <tr
    className={cn(
      "cursor-pointer border-t transition-colors",
      selected ? "bg-primary/10" : "hover:bg-muted/50",
    )}
    onClick={onSelect}
  >
    <td className="px-3 py-2 font-medium">{group.displayName}</td>
    <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
      {group.groupCode}
    </td>
    <td className="px-3 py-2">
      <Badge variant={group.isActive ? "default" : "secondary"}>
        {group.isActive ? activeLabel : inactiveLabel}
      </Badge>
    </td>
    <td className="px-3 py-2 text-muted-foreground">{group.itemCount}</td>
    <td className="px-3 py-2">
      <div className="flex justify-end gap-1">
        <Button size="icon-sm" variant="ghost" onClick={withStop(onEdit)}>
          <Pencil className="size-4" />
        </Button>
        <Button size="icon-sm" variant="ghost" onClick={withStop(onDeactivate)}>
          <Trash2 className="size-4" />
        </Button>
      </div>
    </td>
  </tr>
);

const withStop =
  (handler: () => void) => (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    handler();
  };

type ItemRowProps = {
  item: CommonCodeItemDto;
  onEdit: () => void;
  onDeactivate: () => void;
  activeLabel: string;
  inactiveLabel: string;
};

const ItemRow = ({
  item,
  onEdit,
  onDeactivate,
  activeLabel,
  inactiveLabel,
}: ItemRowProps) => (
  <tr className="border-t">
    <td className="px-3 py-2 font-mono text-xs">{item.code}</td>
    <td className="px-3 py-2">{item.displayName}</td>
    <td className="px-3 py-2">{item.sortOrder}</td>
    <td className="px-3 py-2">
      <Badge variant={item.isActive ? "default" : "secondary"}>
        {item.isActive ? activeLabel : inactiveLabel}
      </Badge>
    </td>
    <td className="px-3 py-2">
      <div className="flex justify-end gap-1">
        <Button size="icon-sm" variant="ghost" onClick={onEdit}>
          <Pencil className="size-4" />
        </Button>
        <Button size="icon-sm" variant="ghost" onClick={onDeactivate}>
          <Trash2 className="size-4" />
        </Button>
      </div>
    </td>
  </tr>
);
