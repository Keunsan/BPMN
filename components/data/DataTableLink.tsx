"use client";

import { Link2, Save, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import {
  ExternalTableBrowser,
  type ExternalTableSelection,
} from "@/components/data/ExternalTableBrowser";
import { DataGrid, type DataGridColumn } from "@/components/common/DataGrid";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import {
  ContentPanel,
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
import type { TaskDataTableLinkDto, UpsertTaskDataTableLinkDto } from "@/types/data-table";
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
  const selectedProcess = processOptions.find((process) => process.nodeId === nodeId);
  const { data: links, isLoading, refetch } = useTaskDataTableLinks(nodeId);
  const createLink = useCreateTaskDataTableLink(nodeId);
  const deleteLink = useDeleteTaskDataTableLink(nodeId);
  const linkTypeLabel = t(`linkTypes.${form.linkType}`);
  const crudTypeLabel = t(`crudTypes.${form.crudType}`);

  const linkColumns = useMemo<DataGridColumn<TaskDataTableLinkDto>[]>(
    () => [
      {
        key: "no",
        header: "No.",
        width: 48,
        minWidth: 44,
        align: "center",
        cell: (_link, rowIndex) => rowIndex + 1,
      },
      {
        key: "system",
        header: t("system"),
        width: 140,
        minWidth: 100,
        cell: (link) => link.systemName,
      },
      {
        key: "table",
        header: t("table"),
        width: 220,
        minWidth: 160,
        cell: (link) => (
          <div>
            <div className="font-mono text-[11px]">
              {link.schemaName ? `${link.schemaName}.` : ""}
              {link.tableName}
            </div>
            <div className="text-[10px] text-slate-500">
              {link.tableNameKor ?? "-"}
            </div>
          </div>
        ),
      },
      {
        key: "linkType",
        header: t("linkType"),
        width: 100,
        minWidth: 80,
        cell: (link) => (
          <Badge className="h-5 px-1.5 text-[10px]">
            {t(`linkTypes.${link.linkType}`)}
          </Badge>
        ),
      },
      {
        key: "crudType",
        header: t("crudType"),
        width: 88,
        minWidth: 72,
        align: "center",
        cell: (link) => link.crudType ?? "-",
      },
      {
        key: "keyColumns",
        header: t("keyColumns"),
        width: 160,
        minWidth: 120,
        cell: (link) => link.keyColumns ?? "-",
      },
      {
        key: "actions",
        header: t("actions"),
        width: 96,
        minWidth: 80,
        align: "center",
        cell: (link) => (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-[11px]"
            onClick={() => deleteLink.mutate(link.linkId)}
          >
            <Trash2 className="size-3.5" />
            {tc("delete")}
          </Button>
        ),
      },
    ],
    [deleteLink, t, tc],
  );

  const renderLinkBody = () => {
    if (!nodeId) {
      return <EmptyState title={t("selectTask")} className="min-h-[240px]" />;
    }

    if (isLoading) {
      return <LoadingSpinner className="min-h-[240px]" />;
    }

    return undefined;
  };

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
    <ListPageLayout>
      <PageHeader
        title={t("title")}
        description={t("description")}
        icon={Link2}
        actions={
          <PageActions
            onSearch={() => void refetch()}
            onRegister={() => void handleSave()}
            registerLabel={tc("save")}
            registerDisabled={!nodeId || !selection || createLink.isPending}
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
          </FilterPanel>
        }
        content={
          <PageContent>
            <div className="flex min-h-0 flex-1 flex-col gap-1.5">
              <ContentPanel title={t("linkSettings")} icon bodyClassName="space-y-4 p-4">
                <ExternalTableBrowser
                  embedded
                  selected={selection}
                  onSelect={setSelection}
                />

                <div>
                  <p className="mb-3 text-[10px] text-slate-400 dark:text-slate-500">
                    {selection
                      ? `${selection.systemName} · ${selection.schemaName ?? "-"} · ${selection.tableName}`
                      : t("selectTableFirst")}
                  </p>
                  <div className="grid gap-3 md:grid-cols-3">
          <Field label={t("linkType")}>
            <Select
              value={form.linkType}
              onValueChange={(value) =>
                value && setForm({ ...form, linkType: value as DataLinkType })
              }
            >
              <SelectTrigger variant="filter">
                <SelectValue>{linkTypeLabel}</SelectValue>
              </SelectTrigger>
              <SelectContent variant="filter">
                {LINK_TYPES.map((type) => (
                  <SelectItem variant="filter" key={type} value={type}>
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
              <SelectTrigger variant="filter">
                <SelectValue>{crudTypeLabel}</SelectValue>
              </SelectTrigger>
              <SelectContent variant="filter">
                {CRUD_TYPES.map((type) => (
                  <SelectItem variant="filter" key={type} value={type}>
                    {t(`crudTypes.${type}`)}
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
                </div>
              </ContentPanel>

              <DataGrid
                title={t("linkedTables")}
                count={links?.length ?? 0}
                countSuffix={tc("countUnit")}
                icon
                columns={linkColumns}
                data={links ?? []}
                rowKey={(link) => link.linkId}
                storageKey="pams-data-table-links-grid"
                emptyMessage={t("emptyLinks")}
                body={renderLinkBody()}
              />
            </div>
          </PageContent>
        }
      />
    </ListPageLayout>
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
