"use client";

import { Save, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import {
  ExternalTableBrowser,
  type ExternalTableSelection,
} from "@/components/data/ExternalTableBrowser";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
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
import { Textarea } from "@/components/ui/textarea";
import {
  useCreateTaskDataTableLink,
  useDeleteTaskDataTableLink,
  useTaskDataTableLinks,
} from "@/lib/query/hooks/useExternalTables";
import { useProcessTree } from "@/lib/query/hooks/useProcess";
import type { UpsertTaskDataTableLinkDto } from "@/types/data-table";
import type { CrudType, DataLinkType } from "@/types/metadata";
import type { ProcessNodeTree } from "@/types/process";

type ProcessOption = {
  nodeId: number;
  code: string;
  name: string;
  level: string;
};

const LINK_TYPES: DataLinkType[] = ["INPUT", "OUTPUT", "REFERENCE"];
const CRUD_TYPES: CrudType[] = [
  "C",
  "R",
  "U",
  "D",
  "CR",
  "CU",
  "CRU",
  "CRUD",
  "RU",
  "RD",
  "CRD",
  "RUD",
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

/** Task와 외부 데이터 테이블 연결 화면 */
export const DataTableLink = () => {
  const t = useTranslations("dataLink");
  const tc = useTranslations("common");
  const [nodeId, setNodeId] = useState(0);
  const [selection, setSelection] = useState<ExternalTableSelection | null>(null);
  const [form, setForm] = useState({
    linkType: "INPUT" as DataLinkType,
    crudType: "R" as CrudType,
    keyColumns: "",
    filterCondition: "",
    description: "",
    isCritical: false,
  });

  const { data: tree } = useProcessTree();
  const processOptions = useMemo(() => flattenProcesses(tree), [tree]);
  const { data: links, isLoading, refetch } = useTaskDataTableLinks(nodeId);
  const createLink = useCreateTaskDataTableLink(nodeId);
  const deleteLink = useDeleteTaskDataTableLink(nodeId);

  const handleSave = async () => {
    if (!nodeId || !selection) {
      return;
    }

    const payload: UpsertTaskDataTableLinkDto = {
      nodeId,
      systemId: selection.systemId,
      schemaName: selection.schemaName,
      tableName: selection.tableName,
      tableNameKor: selection.tableNameKor,
      linkType: form.linkType,
      crudType: form.crudType,
      keyColumns: form.keyColumns,
      filterCondition: form.filterCondition,
      description: form.description,
      isCritical: form.isCritical,
    };

    await createLink.mutateAsync(payload);
    await refetch();
  };

  return (
    <div className="space-y-4 p-4">
      <div>
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("description")}</p>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <div className="max-w-xl space-y-1.5">
          <Label>{t("task")}</Label>
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
        </div>
      </div>

      <ExternalTableBrowser selected={selection} onSelect={setSelection} />

      <section className="rounded-lg border bg-card p-4">
        <div className="mb-4">
          <h2 className="font-semibold">{t("linkSettings")}</h2>
          <p className="text-sm text-muted-foreground">
            {selection
              ? `${selection.systemName} · ${selection.schemaName ?? "-"} · ${selection.tableName}`
              : t("selectTableFirst")}
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <Field label={t("linkType")}>
            <Select
              value={form.linkType}
              onValueChange={(value) =>
                value && setForm({ ...form, linkType: value as DataLinkType })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LINK_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {t(`linkTypes.${type}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label={t("crudType")}>
            <Select
              value={form.crudType}
              onValueChange={(value) =>
                value && setForm({ ...form, crudType: value as CrudType })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CRUD_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label={t("keyColumns")}>
            <Input
              value={form.keyColumns}
              onChange={(event) =>
                setForm({ ...form, keyColumns: event.target.value })
              }
              placeholder="ORDER_ID, ITEM_ID"
            />
          </Field>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <Field label={t("filterCondition")}>
            <Input
              value={form.filterCondition}
              onChange={(event) =>
                setForm({ ...form, filterCondition: event.target.value })
              }
            />
          </Field>
          <Field label={t("critical")}>
            <label className="flex h-9 items-center gap-2 rounded-lg border px-3 text-sm">
              <input
                type="checkbox"
                checked={form.isCritical}
                onChange={(event) =>
                  setForm({ ...form, isCritical: event.target.checked })
                }
              />
              {t("markCritical")}
            </label>
          </Field>
        </div>
        <Field label={t("descriptionField")}>
          <Textarea
            value={form.description}
            onChange={(event) =>
              setForm({ ...form, description: event.target.value })
            }
          />
        </Field>
        <div className="mt-4 flex justify-end">
          <Button
            type="button"
            disabled={!nodeId || !selection || createLink.isPending}
            onClick={() => void handleSave()}
          >
            <Save className="size-4" />
            {tc("save")}
          </Button>
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border bg-card">
        <div className="border-b p-3 font-semibold">{t("linkedTables")}</div>
        {!nodeId ? (
          <EmptyState title={t("selectTask")} className="min-h-52" />
        ) : isLoading ? (
          <LoadingSpinner className="min-h-52" />
        ) : !links?.length ? (
          <EmptyState title={t("emptyLinks")} className="min-h-52" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="border-b bg-muted/40 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">{t("system")}</th>
                  <th className="px-4 py-3 font-medium">{t("table")}</th>
                  <th className="px-4 py-3 font-medium">{t("linkType")}</th>
                  <th className="px-4 py-3 font-medium">{t("crudType")}</th>
                  <th className="px-4 py-3 font-medium">{t("keyColumns")}</th>
                  <th className="px-4 py-3 font-medium">{t("actions")}</th>
                </tr>
              </thead>
              <tbody>
                {links.map((link) => (
                  <tr key={link.linkId} className="border-b last:border-b-0">
                    <td className="px-4 py-3">{link.systemName}</td>
                    <td className="px-4 py-3">
                      <div className="font-mono text-xs">
                        {link.schemaName ? `${link.schemaName}.` : ""}
                        {link.tableName}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {link.tableNameKor ?? "-"}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge>{t(`linkTypes.${link.linkType}`)}</Badge>
                    </td>
                    <td className="px-4 py-3">{link.crudType ?? "-"}</td>
                    <td className="px-4 py-3">{link.keyColumns ?? "-"}</td>
                    <td className="px-4 py-3">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteLink.mutate(link.linkId)}
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
