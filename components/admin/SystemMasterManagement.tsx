"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { EmptyState } from "@/components/common/EmptyState";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { SearchBar } from "@/components/common/SearchBar";
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
import { useDebounce } from "@/hooks/useDebounce";
import {
  useCreateModule,
  useCreateScreen,
  useCreateSystem,
  useDeactivateModule,
  useDeactivateScreen,
  useDeactivateSystem,
  useModuleScreens,
  useSystemModules,
  useSystems,
  useUpdateModule,
  useUpdateScreen,
  useUpdateSystem,
} from "@/lib/query/hooks/useSystems";
import type {
  ApplicationSystemDto,
  ApiAuthType,
  ScreenType,
  SystemModuleDto,
  SystemScreenDto,
  SystemType,
  UpsertApplicationSystemDto,
  UpsertSystemModuleDto,
  UpsertSystemScreenDto,
} from "@/types/system";

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
  "PORTAL",
  "LEGACY",
  "OTHER",
];

const SCREEN_TYPES: ScreenType[] = [
  "INPUT",
  "INQUIRY",
  "REPORT",
  "MASTER",
  "BATCH",
  "APPROVAL",
  "DASHBOARD",
];

const AUTH_TYPES: ApiAuthType[] = ["NONE", "BASIC", "OAUTH", "API_KEY"];

const emptySystem: UpsertApplicationSystemDto = {
  systemCode: "",
  systemName: "",
  systemType: "ERP",
  vendor: "",
  version: "",
  description: "",
  isActive: true,
  tableApiUrl: "",
  tableApiAuthType: "NONE",
  tableApiConfig: null,
  columnApiUrl: "",
};

const emptyModule = (systemId: number): UpsertSystemModuleDto => ({
  systemId,
  moduleCode: "",
  moduleName: "",
  description: "",
  isActive: true,
});

const emptyScreen = (moduleId: number): UpsertSystemScreenDto => ({
  moduleId,
  screenCode: "",
  screenName: "",
  transactionCode: "",
  menuPath: "",
  screenType: "INPUT",
  url: "",
  description: "",
  isActive: true,
});

/** 시스템/모듈/화면 마스터 관리 */
export const SystemMasterManagement = () => {
  const t = useTranslations("systems");
  const tc = useTranslations("common");
  const [search, setSearch] = useState("");
  const [selectedSystemId, setSelectedSystemId] = useState<number | null>(null);
  const [selectedModuleId, setSelectedModuleId] = useState<number | null>(null);
  const [systemForm, setSystemForm] =
    useState<UpsertApplicationSystemDto>(emptySystem);
  const [editingSystemId, setEditingSystemId] = useState<number | null>(null);
  const [moduleForm, setModuleForm] = useState<UpsertSystemModuleDto>(
    emptyModule(0),
  );
  const [editingModuleId, setEditingModuleId] = useState<number | null>(null);
  const [screenForm, setScreenForm] = useState<UpsertSystemScreenDto>(
    emptyScreen(0),
  );
  const [editingScreenId, setEditingScreenId] = useState<number | null>(null);
  const debouncedSearch = useDebounce(search, 300);

  const { data: systems, isLoading, isError, refetch } = useSystems({
    search: debouncedSearch,
  });
  const { data: modules } = useSystemModules(selectedSystemId ?? 0);
  const { data: screens } = useModuleScreens(selectedModuleId ?? 0);

  const createSystem = useCreateSystem();
  const updateSystem = useUpdateSystem(editingSystemId ?? 0);
  const deactivateSystem = useDeactivateSystem();
  const createModule = useCreateModule(selectedSystemId ?? 0);
  const updateModule = useUpdateModule(editingModuleId ?? 0);
  const deactivateModule = useDeactivateModule();
  const createScreen = useCreateScreen(selectedModuleId ?? 0);
  const updateScreen = useUpdateScreen(editingScreenId ?? 0);
  const deactivateScreen = useDeactivateScreen();

  const selectedSystem = useMemo(
    () => systems?.find((system) => system.systemId === selectedSystemId),
    [selectedSystemId, systems],
  );

  const startNewSystem = () => {
    setEditingSystemId(null);
    setSystemForm(emptySystem);
  };

  const startEditSystem = (system: ApplicationSystemDto) => {
    setEditingSystemId(system.systemId);
    setSelectedSystemId(system.systemId);
    setSelectedModuleId(null);
    setSystemForm({
      systemCode: system.systemCode,
      systemName: system.systemName,
      systemType: system.systemType,
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
  };

  const handleSystemSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (editingSystemId) {
      await updateSystem.mutateAsync(systemForm);
    } else {
      const created = await createSystem.mutateAsync(systemForm);
      setSelectedSystemId(created.systemId);
    }
    startNewSystem();
  };

  const startNewModule = () => {
    setEditingModuleId(null);
    setModuleForm(emptyModule(selectedSystemId ?? 0));
  };

  const startEditModule = (module: SystemModuleDto) => {
    setEditingModuleId(module.moduleId);
    setSelectedModuleId(module.moduleId);
    setModuleForm({
      systemId: module.systemId,
      moduleCode: module.moduleCode,
      moduleName: module.moduleName,
      description: module.description ?? "",
      isActive: module.isActive,
    });
  };

  const handleModuleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedSystemId) return;

    const payload = { ...moduleForm, systemId: selectedSystemId };
    if (editingModuleId) {
      await updateModule.mutateAsync(payload);
    } else {
      const created = await createModule.mutateAsync(payload);
      setSelectedModuleId(created.moduleId);
    }
    startNewModule();
  };

  const startNewScreen = () => {
    setEditingScreenId(null);
    setScreenForm(emptyScreen(selectedModuleId ?? 0));
  };

  const startEditScreen = (screen: SystemScreenDto) => {
    setEditingScreenId(screen.screenId);
    setScreenForm({
      moduleId: screen.moduleId,
      screenCode: screen.screenCode,
      screenName: screen.screenName,
      transactionCode: screen.transactionCode ?? "",
      menuPath: screen.menuPath ?? "",
      screenType: screen.screenType ?? "INPUT",
      url: screen.url ?? "",
      description: screen.description ?? "",
      isActive: screen.isActive,
    });
  };

  const handleScreenSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedModuleId) return;

    const payload = { ...screenForm, moduleId: selectedModuleId };
    if (editingScreenId) {
      await updateScreen.mutateAsync(payload);
    } else {
      await createScreen.mutateAsync(payload);
    }
    startNewScreen();
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
    <div className="space-y-4 p-4">
      <div>
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("description")}</p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(320px,0.9fr)_minmax(360px,1fr)_minmax(360px,1fr)]">
        <section className="rounded-lg border bg-card">
          <PanelHeader title={t("systems")} count={systems?.length ?? 0}>
            <Button size="sm" onClick={startNewSystem}>
              <Plus className="size-4" />
              {t("newSystem")}
            </Button>
          </PanelHeader>
          <div className="border-b p-3">
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder={t("systemSearch")}
            />
          </div>
          <ListBody>
            {systems?.map((system) => (
              <button
                key={system.systemId}
                type="button"
                onClick={() => {
                  setSelectedSystemId(system.systemId);
                  setSelectedModuleId(null);
                  startEditSystem(system);
                  startNewModule();
                  startNewScreen();
                }}
                className="w-full border-b p-3 text-left last:border-b-0 hover:bg-muted/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-medium">{system.systemName}</div>
                    <div className="font-mono text-xs text-muted-foreground">
                      {system.systemCode}
                    </div>
                  </div>
                  <Badge variant={system.isActive ? "default" : "secondary"}>
                    {system.systemType}
                  </Badge>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {system.description || "-"}
                </p>
              </button>
            ))}
          </ListBody>
          <SystemForm
            value={systemForm}
            editing={editingSystemId !== null}
            pending={createSystem.isPending || updateSystem.isPending}
            onChange={setSystemForm}
            onSubmit={handleSystemSubmit}
            onDeactivate={() =>
              editingSystemId && deactivateSystem.mutate(editingSystemId)
            }
            t={t}
            tc={tc}
          />
        </section>

        <section className="rounded-lg border bg-card">
          <PanelHeader title={t("modules")} count={modules?.length ?? 0}>
            <Button size="sm" disabled={!selectedSystemId} onClick={startNewModule}>
              <Plus className="size-4" />
              {t("newModule")}
            </Button>
          </PanelHeader>
          {!selectedSystem ? (
            <EmptyState title={t("selectSystem")} className="min-h-52" />
          ) : (
            <>
              <ListBody>
                {modules?.map((module) => (
                  <button
                    key={module.moduleId}
                    type="button"
                    onClick={() => {
                      setSelectedModuleId(module.moduleId);
                      startEditModule(module);
                      startNewScreen();
                    }}
                    className="w-full border-b p-3 text-left last:border-b-0 hover:bg-muted/40"
                  >
                    <div className="flex justify-between gap-2">
                      <div>
                        <div className="font-medium">{module.moduleName}</div>
                        <div className="font-mono text-xs text-muted-foreground">
                          {module.moduleCode}
                        </div>
                      </div>
                      <Badge variant={module.isActive ? "default" : "secondary"}>
                        {module.screenCount ?? 0}
                      </Badge>
                    </div>
                  </button>
                ))}
              </ListBody>
              <ModuleForm
                value={moduleForm}
                editing={editingModuleId !== null}
                disabled={!selectedSystemId}
                pending={createModule.isPending || updateModule.isPending}
                onChange={setModuleForm}
                onSubmit={handleModuleSubmit}
                onDeactivate={() =>
                  editingModuleId && deactivateModule.mutate(editingModuleId)
                }
                t={t}
                tc={tc}
              />
            </>
          )}
        </section>

        <section className="rounded-lg border bg-card">
          <PanelHeader title={t("screens")} count={screens?.length ?? 0}>
            <Button size="sm" disabled={!selectedModuleId} onClick={startNewScreen}>
              <Plus className="size-4" />
              {t("newScreen")}
            </Button>
          </PanelHeader>
          {!selectedModuleId ? (
            <EmptyState title={t("selectModule")} className="min-h-52" />
          ) : (
            <>
              <ListBody>
                {screens?.map((screen) => (
                  <div
                    key={screen.screenId}
                    className="flex items-start justify-between gap-2 border-b p-3 last:border-b-0"
                  >
                    <div>
                      <div className="font-medium">{screen.screenName}</div>
                      <div className="font-mono text-xs text-muted-foreground">
                        {screen.screenCode}
                        {screen.transactionCode
                          ? ` · ${screen.transactionCode}`
                          : ""}
                      </div>
                      <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                        {screen.menuPath || screen.url || "-"}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => startEditScreen(screen)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => deactivateScreen.mutate(screen.screenId)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </ListBody>
              <ScreenForm
                value={screenForm}
                editing={editingScreenId !== null}
                disabled={!selectedModuleId}
                pending={createScreen.isPending || updateScreen.isPending}
                onChange={setScreenForm}
                onSubmit={handleScreenSubmit}
                t={t}
                tc={tc}
              />
            </>
          )}
        </section>
      </div>
    </div>
  );
};

const PanelHeader = ({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) => (
  <div className="flex items-center justify-between gap-2 border-b p-3">
    <h2 className="font-semibold">
      {title}
      <span className="ml-1 text-sm text-muted-foreground">({count})</span>
    </h2>
    {children}
  </div>
);

const ListBody = ({ children }: { children: React.ReactNode }) => (
  <div className="max-h-80 overflow-y-auto">{children}</div>
);

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
  onChange,
  onSubmit,
  onDeactivate,
  t,
  tc,
}: {
  value: UpsertApplicationSystemDto;
  editing: boolean;
  pending: boolean;
  onChange: (value: UpsertApplicationSystemDto) => void;
  onSubmit: (event: React.FormEvent) => void;
  onDeactivate: () => void;
  t: Translation;
  tc: Translation;
}) => (
  <form className="space-y-3 border-t p-3" onSubmit={onSubmit}>
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label={t("systemCode")}>
        <Input
          value={value.systemCode}
          onChange={(event) => onChange({ ...value, systemCode: event.target.value })}
          required
        />
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
      <Field label={t("systemType")}>
        <Select
          value={value.systemType}
          onValueChange={(systemType) =>
            systemType && onChange({ ...value, systemType: systemType as SystemType })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SYSTEM_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
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
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {AUTH_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
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
    <div className="flex justify-between gap-2">
      {editing ? (
        <Button type="button" variant="ghost" onClick={onDeactivate}>
          <Trash2 className="size-4" />
          {tc("delete")}
        </Button>
      ) : (
        <span />
      )}
      <Button type="submit" disabled={pending}>
        {tc("save")}
      </Button>
    </div>
  </form>
);

const ModuleForm = ({
  value,
  editing,
  disabled,
  pending,
  onChange,
  onSubmit,
  onDeactivate,
  t,
  tc,
}: {
  value: UpsertSystemModuleDto;
  editing: boolean;
  disabled: boolean;
  pending: boolean;
  onChange: (value: UpsertSystemModuleDto) => void;
  onSubmit: (event: React.FormEvent) => void;
  onDeactivate: () => void;
  t: Translation;
  tc: Translation;
}) => (
  <form className="space-y-3 border-t p-3" onSubmit={onSubmit}>
    <Field label={t("moduleCode")}>
      <Input
        value={value.moduleCode}
        disabled={disabled}
        onChange={(event) => onChange({ ...value, moduleCode: event.target.value })}
        required
      />
    </Field>
    <Field label={t("moduleName")}>
      <Input
        value={value.moduleName}
        disabled={disabled}
        onChange={(event) => onChange({ ...value, moduleName: event.target.value })}
        required
      />
    </Field>
    <Field label={t("descriptionField")}>
      <Textarea
        value={value.description ?? ""}
        disabled={disabled}
        onChange={(event) => onChange({ ...value, description: event.target.value })}
      />
    </Field>
    <div className="flex justify-between gap-2">
      {editing ? (
        <Button type="button" variant="ghost" onClick={onDeactivate}>
          <Trash2 className="size-4" />
          {tc("delete")}
        </Button>
      ) : (
        <span />
      )}
      <Button type="submit" disabled={disabled || pending}>
        {tc("save")}
      </Button>
    </div>
  </form>
);

const ScreenForm = ({
  value,
  editing,
  disabled,
  pending,
  onChange,
  onSubmit,
  t,
  tc,
}: {
  value: UpsertSystemScreenDto;
  editing: boolean;
  disabled: boolean;
  pending: boolean;
  onChange: (value: UpsertSystemScreenDto) => void;
  onSubmit: (event: React.FormEvent) => void;
  t: Translation;
  tc: Translation;
}) => (
  <form className="space-y-3 border-t p-3" onSubmit={onSubmit}>
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label={t("screenCode")}>
        <Input
          value={value.screenCode}
          disabled={disabled}
          onChange={(event) => onChange({ ...value, screenCode: event.target.value })}
          required
        />
      </Field>
      <Field label={t("screenName")}>
        <Input
          value={value.screenName}
          disabled={disabled}
          onChange={(event) => onChange({ ...value, screenName: event.target.value })}
          required
        />
      </Field>
    </div>
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label={t("transactionCode")}>
        <Input
          value={value.transactionCode ?? ""}
          disabled={disabled}
          onChange={(event) =>
            onChange({ ...value, transactionCode: event.target.value })
          }
        />
      </Field>
      <Field label={t("screenType")}>
        <Select
          value={value.screenType ?? "INPUT"}
          onValueChange={(screenType) =>
            screenType && onChange({ ...value, screenType: screenType as ScreenType })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SCREEN_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
    </div>
    <Field label={t("menuPath")}>
      <Input
        value={value.menuPath ?? ""}
        disabled={disabled}
        onChange={(event) => onChange({ ...value, menuPath: event.target.value })}
      />
    </Field>
    <Field label={t("url")}>
      <Input
        value={value.url ?? ""}
        disabled={disabled}
        onChange={(event) => onChange({ ...value, url: event.target.value })}
      />
    </Field>
    <Button type="submit" disabled={disabled || pending}>
      {editing ? tc("save") : t("addScreen")}
    </Button>
  </form>
);
