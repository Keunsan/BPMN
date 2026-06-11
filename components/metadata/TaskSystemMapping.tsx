"use client";

import { Link2, Trash2 } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  useCreateTaskSystemMapping,
  useDeleteTaskSystemMapping,
  useSystemHierarchy,
  useTaskSystemMappings,
} from "@/lib/query/hooks/useSystems";
import { useProcessTree } from "@/lib/query/hooks/useProcess";
import { formatSystemLabel } from "@/lib/utils/system-label";
import type { ProcessNodeTree } from "@/types/process";
import type { TaskSystemMappingDto } from "@/types/system";
import type { SystemUsageType } from "@/types/system";

type ProcessOption = {
  nodeId: number;
  code: string;
  name: string;
  level: string;
};

const USAGE_TYPES: SystemUsageType[] = [
  "EXECUTE",
  "INQUIRY",
  "APPROVAL",
  "REPORT",
  "INTERFACE",
];

const flattenProcesses = (nodes: ProcessNodeTree[] = []): ProcessOption[] =>
  nodes.flatMap((node) => [
    ...(node.level === "L3" || node.level === "L4"
      ? [
          {
            nodeId: node.nodeId,
            code: node.code,
            name: node.name,
            level: node.level,
          },
        ]
      : []),
    ...flattenProcesses(node.children ?? []),
  ]);

/** Task-시스템/화면 매핑 관리 */
export const TaskSystemMapping = () => {
  const t = useTranslations("systemMapping");
  const tc = useTranslations("common");
  const [nodeId, setNodeId] = useState(0);
  const [systemId, setSystemId] = useState(0);
  const [moduleId, setModuleId] = useState(0);
  const [screenId, setScreenId] = useState(0);
  const [usageType, setUsageType] = useState<SystemUsageType>("EXECUTE");
  const [usageDescription, setUsageDescription] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);

  const { data: tree } = useProcessTree();
  const { data: hierarchy } = useSystemHierarchy();
  const { data: mappings, isLoading, refetch } = useTaskSystemMappings(nodeId);
  const createMapping = useCreateTaskSystemMapping(nodeId);
  const deleteMapping = useDeleteTaskSystemMapping(nodeId);

  const processOptions = useMemo(() => flattenProcesses(tree), [tree]);
  const selectedProcess = processOptions.find((process) => process.nodeId === nodeId);
  const selectedSystem = hierarchy?.find((system) => system.systemId === systemId);
  const selectedModule = selectedSystem?.modules.find(
    (module) => module.moduleId === moduleId,
  );
  const selectedScreen = selectedModule?.screens.find(
    (screen) => screen.screenId === screenId,
  );
  const usageTypeLabel = t(`usageTypes.${usageType}`);

  const handleSave = async () => {
    if (!nodeId || !screenId) {
      return;
    }

    await createMapping.mutateAsync({
      nodeId,
      screenId,
      usageType,
      usageDescription,
      isPrimary,
    });
    setUsageDescription("");
    setIsPrimary(false);
    await refetch();
  };

  const mappingColumns = useMemo<DataGridColumn<TaskSystemMappingDto>[]>(
    () => [
      {
        key: "no",
        header: "No.",
        width: 48,
        minWidth: 44,
        align: "center",
        cell: (_mapping, rowIndex) => rowIndex + 1,
      },
      {
        key: "system",
        header: t("system"),
        width: 180,
        minWidth: 140,
        cell: (mapping) => (
          <div>
            <div>{mapping.systemName}</div>
            <div className="font-mono text-[11px] text-slate-500">
              {mapping.systemCode}
            </div>
          </div>
        ),
      },
      {
        key: "module",
        header: t("module"),
        width: 140,
        minWidth: 100,
        cell: (mapping) => mapping.moduleName,
      },
      {
        key: "screen",
        header: t("screen"),
        width: 180,
        minWidth: 140,
        cell: (mapping) => (
          <div>
            <div>{mapping.screenName}</div>
            <div className="text-[10px] text-slate-500">
              {mapping.transactionCode ?? mapping.menuPath ?? "-"}
            </div>
          </div>
        ),
      },
      {
        key: "usageType",
        header: t("usageType"),
        width: 120,
        minWidth: 96,
        cell: (mapping) => (
          <Badge className="h-5 px-1.5 text-[10px]">
            {t(`usageTypes.${mapping.usageType}`)}
          </Badge>
        ),
      },
      {
        key: "primary",
        header: t("primary"),
        width: 88,
        minWidth: 72,
        align: "center",
        cell: (mapping) => (mapping.isPrimary ? t("primaryYes") : "-"),
      },
      {
        key: "actions",
        header: t("actions"),
        width: 96,
        minWidth: 80,
        align: "center",
        cell: (mapping) => (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-[11px]"
            onClick={() => deleteMapping.mutate(mapping.mappingId)}
          >
            <Trash2 className="size-3.5" />
            {tc("delete")}
          </Button>
        ),
      },
    ],
    [deleteMapping, t, tc],
  );

  const renderMappingBody = () => {
    if (!nodeId) {
      return <EmptyState title={t("selectTask")} className="min-h-[240px]" />;
    }

    if (isLoading) {
      return <LoadingSpinner className="min-h-[240px]" />;
    }

    return undefined;
  };

  return (
    <ListPageLayout>
      <PageHeader
        title={t("title")}
        description={t("description")}
        icon={Link2}
        actions={
          <PageActions
            onSearch={() => void refetch()}
            onRegister={() => void handleSave()}
            registerLabel={t("connect")}
            registerDisabled={!nodeId || !screenId || createMapping.isPending}
          />
        }
      />
      <ListPageBody
        filter={
          <FilterPanel>
            <FilterField label={t("task")} required>
                <Select
                  value={nodeId ? String(nodeId) : ""}
                  onValueChange={(value) => setNodeId(Number(value))}
                >
                  <SelectTrigger variant="filter">
                    <SelectValue placeholder={t("selectTask")}>
                      {selectedProcess?.name}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent variant="filter">
                    {processOptions.map((process) => (
                      <SelectItem variant="filter" key={process.nodeId} value={String(process.nodeId)}>
                        {process.code} · {process.name} ({process.level})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FilterField>
              <FilterField label={t("system")}>
                <Select
                  value={systemId ? String(systemId) : ""}
                  onValueChange={(value) => {
                    setSystemId(Number(value));
                    setModuleId(0);
                    setScreenId(0);
                  }}
                >
                  <SelectTrigger variant="filter">
                    <SelectValue placeholder={t("selectSystem")}>
                      {selectedSystem ? formatSystemLabel(selectedSystem) : undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent variant="filter">
                    {hierarchy?.map((system) => (
                      <SelectItem variant="filter" key={system.systemId} value={String(system.systemId)}>
                        {formatSystemLabel(system)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FilterField>
              <FilterField label={t("module")}>
                <Select
                  value={moduleId ? String(moduleId) : ""}
                  onValueChange={(value) => {
                    setModuleId(Number(value));
                    setScreenId(0);
                  }}
                >
                  <SelectTrigger variant="filter">
                    <SelectValue placeholder={t("selectModule")}>
                      {selectedModule?.moduleName}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent variant="filter">
                    {selectedSystem?.modules.map((module) => (
                      <SelectItem variant="filter" key={module.moduleId} value={String(module.moduleId)}>
                        {module.moduleName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FilterField>
              <FilterField label={t("screen")}>
                <Select
                  value={screenId ? String(screenId) : ""}
                  onValueChange={(value) => setScreenId(Number(value))}
                >
                  <SelectTrigger variant="filter">
                    <SelectValue placeholder={t("selectScreen")}>
                      {selectedScreen?.screenName}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent variant="filter">
                    {selectedModule?.screens.map((screen) => (
                      <SelectItem variant="filter" key={screen.screenId} value={String(screen.screenId)}>
                        {screen.screenName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FilterField>
              <FilterField label={t("usageType")}>
                <Select
                  value={usageType}
                  onValueChange={(value) =>
                    value && setUsageType(value as SystemUsageType)
                  }
                >
                  <SelectTrigger variant="filter">
                    <SelectValue>{usageTypeLabel}</SelectValue>
                  </SelectTrigger>
                  <SelectContent variant="filter">
                    {USAGE_TYPES.map((type) => (
                      <SelectItem variant="filter" key={type} value={type}>
                        {t(`usageTypes.${type}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FilterField>
              <FilterField label={t("usageDescription")}>
                <Textarea
                  value={usageDescription}
                  onChange={(event) => setUsageDescription(event.target.value)}
                />
              </FilterField>
              <FilterField label={t("primary")}>
                <label className="flex h-9 items-center gap-2 rounded-lg border px-3 text-sm">
                  <input
                    type="checkbox"
                    checked={isPrimary}
                    onChange={(event) => setIsPrimary(event.target.checked)}
                  />
                  {t("markPrimary")}
                </label>
              </FilterField>
          </FilterPanel>
        }
        content={
          <PageContent>
            <DataGrid
              title={t("linkedSystems")}
              count={mappings?.length ?? 0}
              countSuffix={tc("countUnit")}
              icon
              columns={mappingColumns}
              data={mappings ?? []}
              rowKey={(mapping) => mapping.mappingId}
              storageKey="pams-task-system-mappings-grid"
              emptyMessage={t("emptyMappings")}
              body={renderMappingBody()}
            />
          </PageContent>
        }
      />
    </ListPageLayout>
  );
};
