"use client";

import { Pencil, Shield, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useDebounce } from "@/hooks/useDebounce";
import {
  useCreateRole,
  useDeactivateRole,
  useRoles,
  useUpdateRole,
} from "@/lib/query/hooks/useRoles";
import type { RoleCategory, RoleDto, UpsertRoleDto } from "@/types/role";

const ROLE_CATEGORIES: RoleCategory[] = [
  "BUSINESS",
  "IT",
  "MANAGEMENT",
  "AUDIT",
  "EXTERNAL",
];

const emptyRole: UpsertRoleDto = {
  roleCode: "",
  roleName: "",
  roleDescription: "",
  roleCategory: "BUSINESS",
  isActive: true,
};

/** 역할 마스터 관리 */
export const RoleMasterManagement = () => {
  const t = useTranslations("roles");
  const tc = useTranslations("common");
  const [search, setSearch] = useState("");
  const [roleForm, setRoleForm] = useState<UpsertRoleDto>(emptyRole);
  const [editingRoleId, setEditingRoleId] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const debouncedSearch = useDebounce(search, 300);

  const { data: roles, isLoading, isError, refetch } = useRoles({
    search: debouncedSearch,
    isActive: true,
  });
  const createRole = useCreateRole();
  const updateRole = useUpdateRole(editingRoleId ?? 0);
  const deactivateRole = useDeactivateRole();

  const openCreateDialog = () => {
    setEditingRoleId(null);
    setRoleForm(emptyRole);
    setDialogOpen(true);
  };

  const openEditDialog = (role: RoleDto) => {
    setEditingRoleId(role.roleId);
    setRoleForm({
      roleCode: role.roleCode,
      roleName: role.roleName,
      roleDescription: role.roleDescription ?? "",
      roleCategory: role.roleCategory ?? "BUSINESS",
      isActive: role.isActive,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (editingRoleId) {
      await updateRole.mutateAsync(roleForm);
    } else {
      await createRole.mutateAsync(roleForm);
    }

    setDialogOpen(false);
  };

  const columns = useMemo<DataGridColumn<RoleDto>[]>(
    () => [
      {
        key: "roleCode",
        header: t("roleCode"),
        sortable: true,
        filter: "text",
        value: (row) => row.roleCode,
        cell: (row) => row.roleCode,
      },
      {
        key: "roleName",
        header: t("roleName"),
        sortable: true,
        filter: "text",
        value: (row) => row.roleName,
        cell: (row) => row.roleName,
      },
      {
        key: "roleCategory",
        header: t("roleCategory"),
        sortable: true,
        filter: "select",
        value: (row) => row.roleCategory ?? "",
        cell: (row) =>
          row.roleCategory ? (
            <Badge variant="outline">{t(`categories.${row.roleCategory}`)}</Badge>
          ) : (
            "-"
          ),
      },
      {
        key: "roleDescription",
        header: t("roleDescription"),
        value: (row) => row.roleDescription ?? "",
        cell: (row) => row.roleDescription ?? "-",
      },
      {
        key: "actions",
        header: t("actions"),
        cell: (row) => (
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label={tc("edit")}
              onClick={() => openEditDialog(row)}
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label={tc("delete")}
              onClick={() => deactivateRole.mutate(row.roleId)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ),
      },
    ],
    [deactivateRole, t, tc],
  );

  if (isLoading) {
    return <LoadingSpinner className="min-h-[50vh]" />;
  }

  if (isError) {
    return (
      <EmptyState
        title={t("loadError")}
        action={<Button onClick={() => void refetch()}>{t("retry")}</Button>}
        className="min-h-[50vh]"
      />
    );
  }

  return (
    <ListPageLayout>
      <PageHeader
        title={t("title")}
        description={t("description")}
        icon={Shield}
        actions={
          <PageActions
            onSearch={() => void refetch()}
            onRegister={openCreateDialog}
            registerLabel={t("createRole")}
          />
        }
      />
      <ListPageBody
        filterStorageKey="pams-role-master-filter-panel-width"
        filter={
          <FilterPanel>
            <FilterField label={t("searchPlaceholder")}>
              <SearchBar
                value={search}
                onChange={setSearch}
                placeholder={t("searchPlaceholder")}
              />
            </FilterField>
          </FilterPanel>
        }
        content={
          <PageContent>
            <DataGrid
              title={t("title")}
              count={roles?.length ?? 0}
              countSuffix={tc("countUnit")}
              icon
              columns={columns}
              data={roles ?? []}
              rowKey={(row) => row.roleId}
              storageKey="pams-role-master-grid"
              emptyMessage={t("emptyRoles")}
              fillHeight
            />
          </PageContent>
        }
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingRoleId ? t("editRole") : t("createRole")}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="roleCode">{t("roleCode")}</Label>
              <Input
                id="roleCode"
                value={roleForm.roleCode}
                onChange={(event) =>
                  setRoleForm((prev) => ({
                    ...prev,
                    roleCode: event.target.value,
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="roleName">{t("roleName")}</Label>
              <Input
                id="roleName"
                value={roleForm.roleName}
                onChange={(event) =>
                  setRoleForm((prev) => ({
                    ...prev,
                    roleName: event.target.value,
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="roleCategory">{t("roleCategory")}</Label>
              <Select
                value={roleForm.roleCategory ?? "BUSINESS"}
                onValueChange={(value) =>
                  setRoleForm((prev) => ({
                    ...prev,
                    roleCategory: value as RoleCategory,
                  }))
                }
              >
                <SelectTrigger id="roleCategory">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {t(`categories.${category}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="roleDescription">{t("roleDescription")}</Label>
              <Textarea
                id="roleDescription"
                value={roleForm.roleDescription ?? ""}
                onChange={(event) =>
                  setRoleForm((prev) => ({
                    ...prev,
                    roleDescription: event.target.value,
                  }))
                }
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                {tc("cancel")}
              </Button>
              <Button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={createRole.isPending || updateRole.isPending}
              >
                {tc("save")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </ListPageLayout>
  );
};
