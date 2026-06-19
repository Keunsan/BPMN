"use client";

import { Pencil, Server, Trash2 } from "lucide-react";
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
import { useCommonCodeLookup } from "@/lib/query/hooks/useCommonCode";
import {
  useCreateSystem,
  useDeactivateSystem,
  useSystems,
  useUpdateSystem,
} from "@/lib/query/hooks/useSystems";
import type {
  ApplicationSystemDto,
  ApiAuthType,
  SystemType,
  UpsertApplicationSystemDto,
} from "@/types/system";
import type { CommonCodeLookupItem } from "@/types/common-code";

const SYSTEM_TYPES: SystemType[] = [
  "ERP",
  "MES",
  "SCM",
  "SRM",
  "WMS",
  "QMS",
  "PLM",
  "CRM",
  "HR",
  "FI",
  "BI",
  "GW",
  "ETS",
  "PORTAL",
  "LEGACY",
  "OTHER",
];

const AUTH_TYPES: ApiAuthType[] = ["NONE", "BASIC", "OAUTH", "API_KEY"];

const emptySystem: UpsertApplicationSystemDto = {
  systemCode: "",
  systemName: "",
  systemType: "ERP",
  companyCode: null,
  businessUnitCode: null,
  vendor: "",
  version: "",
  description: "",
  isActive: true,
  tableApiUrl: "",
  tableApiAuthType: "NONE",
  tableApiConfig: null,
  columnApiUrl: "",
};

/** 시스템 마스터 관리 */
export const SystemMasterManagement = () => {
  const t = useTranslations("systems");
  const tc = useTranslations("common");
  const [search, setSearch] = useState("");
  const [systemForm, setSystemForm] =
    useState<UpsertApplicationSystemDto>(emptySystem);
  const [editingSystemId, setEditingSystemId] = useState<number | null>(null);
  const [systemDialogOpen, setSystemDialogOpen] = useState(false);
  const debouncedSearch = useDebounce(search, 300);

  const { data: systems, isLoading, isError, refetch } = useSystems({
    search: debouncedSearch,
    isActive: true,
  });
  const { data: systemCodeOptions = [] } = useCommonCodeLookup("SYS_ID");
  const { data: companyOptions = [] } = useCommonCodeLookup("COMPANY_CD");
  const { data: businessUnitOptions = [] } = useCommonCodeLookup("BU_CD");

  const createSystem = useCreateSystem();
  const updateSystem = useUpdateSystem(editingSystemId ?? 0);
  const deactivateSystem = useDeactivateSystem();

  const buildAutoDescription = (): string => {
    const companyName =
      companyOptions.find((item) => item.code === systemForm.companyCode)
        ?.displayName ?? systemForm.companyCode;
    const businessUnitName =
      businessUnitOptions.find((item) => item.code === systemForm.businessUnitCode)
        ?.displayName ?? systemForm.businessUnitCode;
    const systemName =
      systemCodeOptions.find((item) => item.code === systemForm.systemCode)
        ?.displayName ?? systemForm.systemCode;

    return [companyName, businessUnitName, systemName]
      .filter((value): value is string => Boolean(value?.trim()))
      .join(" ");
  };

  const startNewSystem = () => {
    setEditingSystemId(null);
    setSystemForm(emptySystem);
    setSystemDialogOpen(true);
  };

  const startEditSystem = (system: ApplicationSystemDto) => {
    setEditingSystemId(system.systemId);
    setSystemForm({
      systemCode: system.systemCode,
      systemName: system.systemName,
      systemType: system.systemType,
      companyCode: system.companyCode,
      businessUnitCode: system.businessUnitCode,
      vendor: system.vendor ?? "",
      version: system.version ?? "",
      description: system.description ?? "",
      systemOwnerId: system.systemOwnerId,
      isActive: system.isActive,
      tableApiUrl: system.tableApiUrl ?? "",
      tableApiAuthType: system.tableApiAuthType ?? "NONE",
      tableApiConfig: system.tableApiConfig,
      columnApiUrl: system.columnApiUrl ?? "",
    });
    setSystemDialogOpen(true);
  };

  const systemColumns = useMemo<DataGridColumn<ApplicationSystemDto>[]>(
    () => [
      {
        key: "no",
        header: "No.",
        width: 48,
        minWidth: 44,
        align: "center",
        cell: (_system, rowIndex) => rowIndex + 1,
      },
      {
        key: "systemCode",
        header: t("systemCode"),
        width: 120,
        minWidth: 96,
        sortable: true,
        filter: "text",
        value: (system) => system.systemCode,
        cell: (system) => (
          <span className="font-mono text-sm">{system.systemCode}</span>
        ),
      },
      {
        key: "systemName",
        header: t("systemName"),
        width: 160,
        minWidth: 120,
        sortable: true,
        filter: "text",
        value: (system) => system.systemName,
        cell: (system) => <span className="font-medium">{system.systemName}</span>,
      },
      {
        key: "companyCode",
        header: t("companyCode"),
        width: 140,
        minWidth: 100,
        sortable: true,
        filter: "select",
        value: (system) => system.companyName ?? system.companyCode ?? "",
        cell: (system) => system.companyName ?? system.companyCode ?? "-",
      },
      {
        key: "businessUnitCode",
        header: t("businessUnitCode"),
        width: 140,
        minWidth: 100,
        sortable: true,
        filter: "select",
        value: (system) => system.businessUnitName ?? system.businessUnitCode ?? "",
        cell: (system) =>
          system.businessUnitName ?? system.businessUnitCode ?? "-",
      },
      {
        key: "systemType",
        header: t("systemType"),
        width: 120,
        minWidth: 96,
        sortable: true,
        filter: "select",
        value: (system) => system.systemType,
        cell: (system) => (
          <Badge variant={system.isActive ? "default" : "secondary"}>
            {t(`systemTypes.${system.systemType}`)}
          </Badge>
        ),
      },
      {
        key: "description",
        header: t("descriptionField"),
        width: 220,
        minWidth: 160,
        sortable: true,
        filter: "text",
        value: (system) => system.description ?? "",
        cell: (system) => (
          <p className="line-clamp-2 text-slate-500">
            {system.description || "-"}
          </p>
        ),
      },
      {
        key: "actions",
        header: t("actions"),
        width: 72,
        minWidth: 64,
        align: "center",
        cell: (system) => (
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            onClick={(event) => {
              event.stopPropagation();
              startEditSystem(system);
            }}
          >
            <Pencil className="size-4" />
          </Button>
        ),
      },
    ],
    [t],
  );

  const handleSystemSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const payload: UpsertApplicationSystemDto = {
      ...systemForm,
      description: systemForm.description?.trim()
        ? systemForm.description
        : buildAutoDescription(),
    };

    if (editingSystemId) {
      await updateSystem.mutateAsync(payload);
    } else {
      await createSystem.mutateAsync(payload);
    }
    setSystemDialogOpen(false);
    setEditingSystemId(null);
    setSystemForm(emptySystem);
  };

  if (isLoading) {
    return <LoadingSpinner className="min-h-[50vh]" />;
  }

  if (isError) {
    return (
      <EmptyState
        title={t("loadError")}
        action={<Button onClick={() => void refetch()}>{tc("retry")}</Button>}
        className="min-h-[50vh]"
      />
    );
  }

  return (
    <ListPageLayout>
      <PageHeader
        title={t("title")}
        description={t("description")}
        icon={Server}
        actions={
          <PageActions
            onSearch={() => void refetch()}
            onRegister={startNewSystem}
            registerLabel={t("newSystem")}
          />
        }
      />
      <ListPageBody
        filterStorageKey="pams-system-master-filter-panel-width"
        filter={
          <FilterPanel>
            <FilterField label={t("systemSearch")}>
              <SearchBar
                value={search}
                onChange={setSearch}
                placeholder={t("systemSearch")}
              />
            </FilterField>
          </FilterPanel>
        }
        content={
          <PageContent>
            <DataGrid
              title={t("systems")}
              count={systems?.length ?? 0}
              countSuffix={tc("countUnit")}
              icon
              columns={systemColumns}
              data={systems ?? []}
              rowKey={(system) => system.systemId}
              storageKey="pams-systems-grid"
              emptyMessage={tc("noData")}
              onRowClick={startEditSystem}
              fillHeight
            />
          </PageContent>
        }
      />

      <Dialog
        open={systemDialogOpen}
        onOpenChange={(open) => {
          setSystemDialogOpen(open);
          if (!open) {
            setEditingSystemId(null);
            setSystemForm(emptySystem);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingSystemId ? t("editSystem") : t("newSystem")}
            </DialogTitle>
          </DialogHeader>
          <SystemForm
            value={systemForm}
            editing={editingSystemId !== null}
            pending={createSystem.isPending || updateSystem.isPending}
            systemCodeOptions={systemCodeOptions}
            companyOptions={companyOptions}
            businessUnitOptions={businessUnitOptions}
            onChange={setSystemForm}
            onSubmit={handleSystemSubmit}
            onCancel={() => setSystemDialogOpen(false)}
            onDeactivate={() => {
              if (!editingSystemId) return;
              deactivateSystem.mutate(editingSystemId, {
                onSuccess: () => {
                  setSystemDialogOpen(false);
                  setEditingSystemId(null);
                  setSystemForm(emptySystem);
                },
              });
            }}
            t={t}
            tc={tc}
          />
        </DialogContent>
      </Dialog>
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

type Translation = ReturnType<typeof useTranslations>;

const SystemForm = ({
  value,
  editing,
  pending,
  systemCodeOptions,
  companyOptions,
  businessUnitOptions,
  onChange,
  onSubmit,
  onCancel,
  onDeactivate,
  t,
  tc,
}: {
  value: UpsertApplicationSystemDto;
  editing: boolean;
  pending: boolean;
  systemCodeOptions: CommonCodeLookupItem[];
  companyOptions: CommonCodeLookupItem[];
  businessUnitOptions: CommonCodeLookupItem[];
  onChange: (value: UpsertApplicationSystemDto) => void;
  onSubmit: (event: React.FormEvent) => void;
  onCancel: () => void;
  onDeactivate: () => void;
  t: Translation;
  tc: Translation;
}) => (
  <form className="space-y-3" onSubmit={onSubmit}>
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label={t("systemCode")}>
        <Select
          value={value.systemCode}
          onValueChange={(systemCode) => {
            if (!systemCode) return;
            const selected = systemCodeOptions.find(
              (item) => item.code === systemCode,
            );
            onChange({
              ...value,
              systemCode,
              systemName: value.systemName || selected?.displayName || "",
            });
          }}
        >
          <SelectTrigger variant="filter">
            <SelectValue placeholder={t("selectSystemCode")}>
              {
                systemCodeOptions.find((item) => item.code === value.systemCode)
                  ?.displayName
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent variant="filter">
            {systemCodeOptions.map((item) => (
              <SelectItem variant="filter" key={item.code} value={item.code}>
                {item.displayName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label={t("systemName")}>
        <Input
          value={value.systemName}
          onChange={(event) => onChange({ ...value, systemName: event.target.value })}
          required
        />
      </Field>
    </div>
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label={t("companyCode")}>
        <Select
          value={value.companyCode ?? ""}
          onValueChange={(companyCode) =>
            companyCode && onChange({ ...value, companyCode })
          }
        >
          <SelectTrigger variant="filter">
            <SelectValue placeholder={t("selectCompany")}>
              {
                companyOptions.find((item) => item.code === value.companyCode)
                  ?.displayName
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent variant="filter">
            {companyOptions.map((item) => (
              <SelectItem variant="filter" key={item.code} value={item.code}>
                {item.displayName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label={t("businessUnitCode")}>
        <Select
          value={value.businessUnitCode ?? ""}
          onValueChange={(businessUnitCode) =>
            businessUnitCode && onChange({ ...value, businessUnitCode })
          }
        >
          <SelectTrigger variant="filter">
            <SelectValue placeholder={t("selectBusinessUnit")}>
              {
                businessUnitOptions.find(
                  (item) => item.code === value.businessUnitCode,
                )?.displayName
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent variant="filter">
            {businessUnitOptions.map((item) => (
              <SelectItem variant="filter" key={item.code} value={item.code}>
                {item.displayName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
    </div>
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label={t("systemType")}>
        <Select
          value={value.systemType}
          onValueChange={(systemType) =>
            systemType && onChange({ ...value, systemType: systemType as SystemType })
          }
        >
          <SelectTrigger variant="filter">
            <SelectValue>{t(`systemTypes.${value.systemType}`)}</SelectValue>
          </SelectTrigger>
          <SelectContent variant="filter">
            {SYSTEM_TYPES.map((type) => (
              <SelectItem variant="filter" key={type} value={type}>
                {t(`systemTypes.${type}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label={t("authType")}>
        <Select
          value={value.tableApiAuthType ?? "NONE"}
          onValueChange={(tableApiAuthType) =>
            tableApiAuthType &&
            onChange({
              ...value,
              tableApiAuthType: tableApiAuthType as ApiAuthType,
            })
          }
        >
          <SelectTrigger variant="filter">
            <SelectValue>
              {t(`authTypes.${value.tableApiAuthType ?? "NONE"}`)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent variant="filter">
            {AUTH_TYPES.map((type) => (
              <SelectItem variant="filter" key={type} value={type}>
                {t(`authTypes.${type}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
    </div>
    <Field label={t("descriptionField")}>
      <Textarea
        value={value.description ?? ""}
        onChange={(event) => onChange({ ...value, description: event.target.value })}
      />
    </Field>
    <Field label={t("tableApiUrl")}>
      <Input
        value={value.tableApiUrl ?? ""}
        onChange={(event) => onChange({ ...value, tableApiUrl: event.target.value })}
      />
    </Field>
    <Field label={t("columnApiUrl")}>
      <Input
        value={value.columnApiUrl ?? ""}
        onChange={(event) => onChange({ ...value, columnApiUrl: event.target.value })}
      />
    </Field>
    <div className="flex justify-between gap-2 border-t pt-3">
      {editing ? (
        <Button type="button" variant="ghost" onClick={onDeactivate}>
          <Trash2 className="size-4" />
          {tc("delete")}
        </Button>
      ) : (
        <span />
      )}
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          {tc("cancel")}
        </Button>
        <Button
          type="submit"
          disabled={
            pending ||
            !value.systemCode ||
            !value.companyCode ||
            !value.businessUnitCode
          }
        >
          {tc("save")}
        </Button>
      </div>
    </div>
  </form>
);
