"use client";

import { Link2, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { EmptyState } from "@/components/common/EmptyState";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
import type { ProcessNodeTree } from "@/types/process";
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
  const selectedSystem = hierarchy?.find((system) => system.systemId === systemId);
  const selectedModule = selectedSystem?.modules.find(
    (module) => module.moduleId === moduleId,
  );

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

  return (
    <div className="space-y-4 p-4">
      <div>
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("description")}</p>
      </div>

      <section className="rounded-lg border bg-card p-4">
        <div className="grid gap-3 lg:grid-cols-4">
          <Field label={t("task")}>
            <Select value={nodeId ? String(nodeId) : ""} onValueChange={(value) => setNodeId(Number(value))}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("selectTask")} />
              </SelectTrigger>
              <SelectContent>
                {processOptions.map((process) => (
                  <SelectItem key={process.nodeId} value={String(process.nodeId)}>
                    {process.code} · {process.name} ({process.level})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label={t("system")}>
            <Select
              value={systemId ? String(systemId) : ""}
              onValueChange={(value) => {
                setSystemId(Number(value));
                setModuleId(0);
                setScreenId(0);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("selectSystem")} />
              </SelectTrigger>
              <SelectContent>
                {hierarchy?.map((system) => (
                  <SelectItem key={system.systemId} value={String(system.systemId)}>
                    {system.systemName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label={t("module")}>
            <Select
              value={moduleId ? String(moduleId) : ""}
              onValueChange={(value) => {
                setModuleId(Number(value));
                setScreenId(0);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("selectModule")} />
              </SelectTrigger>
              <SelectContent>
                {selectedSystem?.modules.map((module) => (
                  <SelectItem key={module.moduleId} value={String(module.moduleId)}>
                    {module.moduleName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label={t("screen")}>
            <Select
              value={screenId ? String(screenId) : ""}
              onValueChange={(value) => setScreenId(Number(value))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("selectScreen")} />
              </SelectTrigger>
              <SelectContent>
                {selectedModule?.screens.map((screen) => (
                  <SelectItem key={screen.screenId} value={String(screen.screenId)}>
                    {screen.screenName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <div className="mt-3 grid gap-3 lg:grid-cols-[220px_1fr_160px]">
          <Field label={t("usageType")}>
            <Select
              value={usageType}
              onValueChange={(value) =>
                value && setUsageType(value as SystemUsageType)
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {USAGE_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {t(`usageTypes.${type}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label={t("usageDescription")}>
            <Textarea
              value={usageDescription}
              onChange={(event) => setUsageDescription(event.target.value)}
            />
          </Field>
          <Field label={t("primary")}>
            <label className="flex h-9 items-center gap-2 rounded-lg border px-3 text-sm">
              <input
                type="checkbox"
                checked={isPrimary}
                onChange={(event) => setIsPrimary(event.target.checked)}
              />
              {t("markPrimary")}
            </label>
          </Field>
        </div>
        <div className="mt-4 flex justify-end">
          <Button
            type="button"
            disabled={!nodeId || !screenId || createMapping.isPending}
            onClick={() => void handleSave()}
          >
            <Link2 className="size-4" />
            {t("connect")}
          </Button>
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border bg-card">
        <div className="border-b p-3 font-semibold">{t("linkedSystems")}</div>
        {!nodeId ? (
          <EmptyState title={t("selectTask")} className="min-h-52" />
        ) : isLoading ? (
          <LoadingSpinner className="min-h-52" />
        ) : !mappings?.length ? (
          <EmptyState title={t("emptyMappings")} className="min-h-52" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="border-b bg-muted/40 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">{t("system")}</th>
                  <th className="px-4 py-3 font-medium">{t("module")}</th>
                  <th className="px-4 py-3 font-medium">{t("screen")}</th>
                  <th className="px-4 py-3 font-medium">{t("usageType")}</th>
                  <th className="px-4 py-3 font-medium">{t("primary")}</th>
                  <th className="px-4 py-3 font-medium">{t("actions")}</th>
                </tr>
              </thead>
              <tbody>
                {mappings.map((mapping) => (
                  <tr key={mapping.mappingId} className="border-b last:border-b-0">
                    <td className="px-4 py-3">
                      <div>{mapping.systemName}</div>
                      <div className="font-mono text-xs text-muted-foreground">
                        {mapping.systemCode}
                      </div>
                    </td>
                    <td className="px-4 py-3">{mapping.moduleName}</td>
                    <td className="px-4 py-3">
                      <div>{mapping.screenName}</div>
                      <div className="text-xs text-muted-foreground">
                        {mapping.transactionCode ?? mapping.menuPath ?? "-"}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge>{t(`usageTypes.${mapping.usageType}`)}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      {mapping.isPrimary ? t("primaryYes") : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteMapping.mutate(mapping.mappingId)}
                      >
                        <Trash2 className="size-4" />
                        {tc("delete")}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

const Field = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div className="space-y-1.5">
    <Label>{label}</Label>
    {children}
  </div>
);
