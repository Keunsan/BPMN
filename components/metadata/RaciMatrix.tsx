"use client";

import { Plus, Trash2, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { DataGrid, type DataGridColumn } from "@/components/common/DataGrid";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { ListPageLayout, PageHeader } from "@/components/common/layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TaskMappingSideLayout } from "@/components/metadata/TaskMappingSideLayout";
import { useProcessScopeParams } from "@/components/process/ProcessScopeFilter";
import {
  useCreateTaskRoleMapping,
  useDeleteTaskRoleMapping,
  useTaskRoleMappings,
} from "@/lib/query/hooks/useRaci";
import { useRoles } from "@/lib/query/hooks/useRoles";
import type { RaciType } from "@/types/metadata";
import type { ProcessNodeTree } from "@/types/process";
import type { TaskRoleMappingDto } from "@/types/raci";

const RACI_TYPES: RaciType[] = [
  "RESPONSIBLE",
  "ACCOUNTABLE",
  "CONSULTED",
  "INFORMED",
];

const formatMappingLabel = (mapping: TaskRoleMappingDto): string =>
  mapping.roleName ?? mapping.roleCode ?? "-";

/** Task RACI 매핑 — 좌측 태스크 트리 · 우측 R/A/C/I 매트릭스 */
export const RaciMatrix = () => {
  const t = useTranslations("raci");
  const tc = useTranslations("common");
  const { companyCode, businessUnitCode, setScope, filters: scopeFilters } =
    useProcessScopeParams();

  const [nodeId, setNodeId] = useState(0);
  const [selectedTask, setSelectedTask] = useState<ProcessNodeTree | null>(null);
  const [raciType, setRaciType] = useState<RaciType>("RESPONSIBLE");
  const [roleId, setRoleId] = useState("");
  const [description, setDescription] = useState("");

  const { data: mappings, isLoading, isError, refetch } =
    useTaskRoleMappings(nodeId);
  const { data: roles = [] } = useRoles({ isActive: true });
  const createMapping = useCreateTaskRoleMapping(nodeId);
  const deleteMapping = useDeleteTaskRoleMapping(nodeId);

  const handleSelectTask = (node: ProcessNodeTree) => {
    setSelectedTask(node);
    setNodeId(node.nodeId);
  };

  const handleAddMapping = async () => {
    if (nodeId <= 0 || !roleId) return;

    await createMapping.mutateAsync({
      nodeId,
      raciType,
      roleId: Number(roleId),
      description: description.trim() || null,
    });

    setRoleId("");
    setDescription("");
  };

  const summaryByType = useMemo(() => {
    const grouped: Record<RaciType, TaskRoleMappingDto[]> = {
      RESPONSIBLE: [],
      ACCOUNTABLE: [],
      CONSULTED: [],
      INFORMED: [],
    };

    for (const mapping of mappings ?? []) {
      grouped[mapping.raciType].push(mapping);
    }

    return grouped;
  }, [mappings]);

  const roleSelectItems = useMemo(
    () =>
      roles.map((role) => ({
        value: String(role.roleId),
        label: role.roleName,
      })),
    [roles],
  );

  const raciTypeItems = useMemo(
    () =>
      RACI_TYPES.map((type) => ({
        value: type,
        label: t(`types.${type}`),
      })),
    [t],
  );

  const columns = useMemo<DataGridColumn<TaskRoleMappingDto>[]>(
    () => [
      {
        key: "raciType",
        header: t("raciType"),
        sortable: true,
        filter: "select",
        value: (row) => row.raciType,
        cell: (row) => (
          <Badge variant="outline">{t(`types.${row.raciType}`)}</Badge>
        ),
      },
      {
        key: "role",
        header: t("role"),
        sortable: true,
        filter: "text",
        value: (row) => row.roleName ?? row.roleCode ?? "",
        cell: (row) => row.roleName ?? row.roleCode ?? "-",
      },
      {
        key: "description",
        header: t("description"),
        value: (row) => row.description ?? "",
        cell: (row) => row.description ?? "-",
      },
      {
        key: "actions",
        header: t("actions"),
        cell: (row) => (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={tc("delete")}
            onClick={() => deleteMapping.mutate(row.mappingId)}
          >
            <Trash2 className="size-4" />
          </Button>
        ),
      },
    ],
    [deleteMapping, t, tc],
  );

  return (
    <ListPageLayout>
      <PageHeader title={t("title")} description={t("description")} icon={Users} />
      <TaskMappingSideLayout
        storageKey="pams-raci-left-panel-width"
        splitterLabel={t("panelResizeHorizontal")}
        selectedProcessId={selectedTask?.nodeId}
        onSelectProcess={handleSelectTask}
        selectableLevels={["L3", "L4"]}
        companyCode={companyCode}
        businessUnitCode={businessUnitCode}
        onScopeChange={setScope}
        scopeFilters={scopeFilters}
      >
        {nodeId <= 0 ? (
          <EmptyState title={t("selectTask")} description={t("selectTaskHint")} />
        ) : (
          <div className="flex h-full min-h-0 flex-col gap-4">
            <div className="rounded-lg border border-border bg-background p-4 shadow-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{selectedTask?.code}</Badge>
                <span className="text-base font-medium">{selectedTask?.name}</span>
                <Badge variant="outline">{selectedTask?.level}</Badge>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {RACI_TYPES.map((type) => (
                <div
                  key={type}
                  className="rounded-lg border border-border bg-background p-3 shadow-sm"
                >
                  <p className="mb-2 text-sm font-medium">{t(`types.${type}`)}</p>
                  <div className="flex flex-col gap-1">
                    {summaryByType[type].length > 0 ? (
                      summaryByType[type].map((mapping) => (
                        <p
                          key={mapping.mappingId}
                          className="text-sm text-muted-foreground"
                        >
                          {formatMappingLabel(mapping)}
                        </p>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">-</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-lg border border-border bg-background p-4 shadow-sm">
              <p className="mb-3 text-sm font-medium">{t("addMapping")}</p>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="grid gap-2">
                  <Label>{t("raciType")}</Label>
                  <Select
                    value={raciType}
                    onValueChange={(value) => setRaciType(value as RaciType)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent items={raciTypeItems}>
                      {raciTypeItems.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>{t("role")}</Label>
                  <Select
                    value={roleId}
                    onValueChange={(value) => setRoleId(value ?? "")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("selectRole")} />
                    </SelectTrigger>
                    <SelectContent items={roleSelectItems}>
                      {roleSelectItems.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>{t("description")}</Label>
                  <Input
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder={t("descriptionPlaceholder")}
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    type="button"
                    className="w-full"
                    disabled={createMapping.isPending || !roleId}
                    onClick={() => void handleAddMapping()}
                  >
                    <Plus className="size-4" />
                    {t("addMapping")}
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col">
              {isLoading ? (
                <LoadingSpinner />
              ) : isError ? (
                <EmptyState
                  title={t("loadError")}
                  action={
                    <Button onClick={() => void refetch()}>{t("retry")}</Button>
                  }
                />
              ) : (
                <DataGrid
                  columns={columns}
                  data={mappings ?? []}
                  rowKey={(row) => String(row.mappingId)}
                  storageKey="pams-raci-mapping-grid"
                  emptyMessage={t("emptyMappings")}
                  className="flex-1"
                />
              )}
            </div>
          </div>
        )}
      </TaskMappingSideLayout>
    </ListPageLayout>
  );
};
