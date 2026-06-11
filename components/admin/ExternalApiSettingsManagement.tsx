"use client";

import { RefreshCw, Webhook } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { toast } from "sonner";

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
import { formatSystemLabel } from "@/lib/utils/system-label";
import {
  useExternalApiGlobalConfig,
  useExternalApiParamProfile,
  useExternalApiParamProfiles,
  useSaveExternalApiGlobalConfig,
  useSaveExternalApiParamProfile,
  useTestExternalTableListApi,
} from "@/lib/query/hooks/useExternalApiConfig";
import { useSystems } from "@/lib/query/hooks/useSystems";
import { ApiError } from "@/lib/api/error-handler";
import type {
  ExternalApiGlobalConfig,
  ExternalApiParamProfile,
  ExternalApiTestResult,
} from "@/types/external-api";
import type { ApiAuthType } from "@/types/system";

const AUTH_TYPES: ApiAuthType[] = ["NONE", "BASIC", "OAUTH", "API_KEY"];
const AUTH_CONFIG_PLACEHOLDER = `{
  "headers": {
    "client-id": "...",
    "client-secret": "..."
  }
}`;
const TABLE_LIST_PARAMS_PLACEHOLDER = `{
  "inst_id": "0004"
}`;

const parseJsonObject = (
  text: string,
): { value: Record<string, unknown> | null; invalid: boolean } => {
  const trimmed = text.trim();
  if (!trimmed) {
    return { value: null, invalid: false };
  }

  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      !Array.isArray(parsed)
    ) {
      return { value: parsed as Record<string, unknown>, invalid: false };
    }
  } catch {
    return { value: null, invalid: true };
  }

  return { value: null, invalid: true };
};

const toJsonText = (value: Record<string, unknown> | null | undefined): string =>
  value ? JSON.stringify(value, null, 2) : "";

type TestState = {
  result?: ExternalApiTestResult;
  error?: string;
};

/** 외부 API 공통 설정 + 시스템별 파라미터 관리 */
export const ExternalApiSettingsManagement = () => {
  const t = useTranslations("externalApi");
  const tc = useTranslations("common");
  const [search, setSearch] = useState("");
  const [selectedSystemId, setSelectedSystemId] = useState<number | null>(null);
  const debouncedSearch = useDebounce(search, 300);

  const {
    data: globalConfig,
    isLoading: globalLoading,
    isError: globalError,
    refetch: refetchGlobal,
  } = useExternalApiGlobalConfig();
  const {
    data: systems,
    isLoading: systemsLoading,
    isError: systemsError,
    refetch: refetchSystems,
  } = useSystems({
    search: debouncedSearch,
    isActive: true,
  });
  const { data: profiles } = useExternalApiParamProfiles();
  const { data: profile, isLoading: profileLoading } = useExternalApiParamProfile(
    selectedSystemId ?? 0,
  );

  const selectedSystem = useMemo(
    () => systems?.find((system) => system.systemId === selectedSystemId) ?? null,
    [selectedSystemId, systems],
  );

  const configuredSystemIds = useMemo(
    () => new Set(profiles?.map((item) => item.systemId) ?? []),
    [profiles],
  );

  if (globalLoading || systemsLoading) {
    return <LoadingSpinner className="min-h-[50vh]" />;
  }

  if (globalError || systemsError || !globalConfig) {
    return (
      <EmptyState
        title={t("loadError")}
        action={
          <Button
            onClick={() => {
              void refetchGlobal();
              void refetchSystems();
            }}
          >
            {tc("retry")}
          </Button>
        }
        className="min-h-[50vh]"
      />
    );
  }

  return (
    <ListPageLayout>
      <PageHeader
        title={t("title")}
        description={t("description")}
        icon={Webhook}
        actions={
          <PageActions
            onSearch={() => {
              void refetchGlobal();
              void refetchSystems();
            }}
            showRegister={false}
          />
        }
      />
      <ListPageBody
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
            <ContentPanel
              title={t("title")}
              count={systems?.length ?? 0}
              countSuffix={tc("countUnit")}
              icon
              bodyClassName="space-y-6 p-4"
            >
            <GlobalConfigSection
              key={globalConfig.updatedAt?.toString() ?? globalConfig.configId}
              config={globalConfig}
            />

            <div className="grid gap-4 xl:grid-cols-[minmax(320px,0.9fr)_minmax(420px,1.4fr)]">
              <section className="rounded-lg border bg-card">
                <div className="flex items-center justify-between gap-2 border-b p-3">
                  <h2 className="font-semibold">
                    {t("systems")}
                    <span className="ml-1 text-sm text-muted-foreground">
                      ({systems?.length ?? 0})
                    </span>
                  </h2>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void refetchSystems()}
                  >
                    <RefreshCw className="size-4" />
                  </Button>
                </div>
                <div className="max-h-[520px] overflow-y-auto">
            {!systems?.length ? (
              <EmptyState title={tc("noData")} className="min-h-52" />
            ) : (
              systems.map((system) => {
                const configured = configuredSystemIds.has(system.systemId);

                return (
                  <button
                    key={system.systemId}
                    type="button"
                    onClick={() => setSelectedSystemId(system.systemId)}
                    className="w-full border-b p-3 text-left last:border-b-0 hover:bg-muted/40"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-medium">{formatSystemLabel(system)}</div>
                        <div className="font-mono text-xs text-muted-foreground">
                          {system.systemCode}
                        </div>
                      </div>
                      <Badge variant={configured ? "default" : "secondary"}>
                        {configured ? t("configured") : t("notConfigured")}
                      </Badge>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </section>

        <section className="rounded-lg border bg-card">
          <div className="border-b p-3">
            <h2 className="font-semibold">{t("profileSettings")}</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {selectedSystem
                ? `${formatSystemLabel(selectedSystem)} (${selectedSystem.systemCode})`
                : t("selectSystem")}
            </p>
          </div>
          {!selectedSystem ? (
            <EmptyState title={t("selectSystem")} className="min-h-96" />
          ) : profileLoading ? (
            <LoadingSpinner className="min-h-96" />
          ) : (
            <ProfileConfigSection
              key={`${selectedSystem.systemId}-${profile?.updatedAt?.toString() ?? "new"}`}
              systemId={selectedSystem.systemId}
              profile={profile}
            />
          )}
              </section>
            </div>
            </ContentPanel>
          </PageContent>
        }
      />
    </ListPageLayout>
  );
};

const GlobalConfigSection = ({ config }: { config: ExternalApiGlobalConfig }) => {
  const t = useTranslations("externalApi");
  const tc = useTranslations("common");
  const saveGlobal = useSaveExternalApiGlobalConfig();
  const [tableListApiUrl, setTableListApiUrl] = useState(config.tableListApiUrl ?? "");
  const [tableSchemaApiUrl, setTableSchemaApiUrl] = useState(
    config.tableSchemaApiUrl ?? "",
  );
  const [authType, setAuthType] = useState<ApiAuthType>(config.authType ?? "NONE");
  const [authConfigText, setAuthConfigText] = useState(toJsonText(config.authConfig));
  const [configError, setConfigError] = useState(false);
  const authTypeLabel = t(`authTypes.${authType}`);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const { value: authConfig, invalid } = parseJsonObject(authConfigText);
    setConfigError(invalid);
    if (invalid) return;

    await saveGlobal.mutateAsync({
      tableListApiUrl: tableListApiUrl.trim() || null,
      tableSchemaApiUrl: tableSchemaApiUrl.trim() || null,
      authType,
      authConfig,
    });
    toast.success(t("globalSaved"));
  };

  return (
    <section className="rounded-lg border bg-card">
      <div className="border-b p-3">
        <h2 className="font-semibold">{t("commonSettings")}</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("commonSettingsDescription")}
        </p>
      </div>
      <form className="space-y-4 p-4" onSubmit={handleSubmit}>
        <Field label={t("tableListApiUrl")}>
          <Input
            value={tableListApiUrl}
            onChange={(event) => setTableListApiUrl(event.target.value)}
            placeholder="https://apim.example.com/.../md_dgs_003"
          />
        </Field>
        <Field label={t("tableSchemaApiUrl")}>
          <Input
            value={tableSchemaApiUrl}
            onChange={(event) => setTableSchemaApiUrl(event.target.value)}
            placeholder="https://apim.example.com/.../md_dgs_004"
          />
        </Field>
        <Field label={t("authType")}>
          <Select
            value={authType}
            onValueChange={(value) => value && setAuthType(value as ApiAuthType)}
          >
            <SelectTrigger variant="filter">
              <SelectValue>{authTypeLabel}</SelectValue>
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
        <Field label={t("authConfig")}>
          <Textarea
            value={authConfigText}
            onChange={(event) => {
              setAuthConfigText(event.target.value);
              setConfigError(false);
            }}
            className="min-h-36 font-mono text-xs"
            placeholder={AUTH_CONFIG_PLACEHOLDER}
            aria-invalid={configError}
          />
          {configError ? (
            <p className="text-xs text-destructive">{t("invalidJson")}</p>
          ) : (
            <p className="text-xs text-muted-foreground">{t("authConfigHelp")}</p>
          )}
        </Field>
        <div className="flex justify-end">
          <Button type="submit" disabled={saveGlobal.isPending}>
            {tc("save")}
          </Button>
        </div>
      </form>
    </section>
  );
};

const ProfileConfigSection = ({
  systemId,
  profile,
}: {
  systemId: number;
  profile: ExternalApiParamProfile | null | undefined;
}) => {
  const t = useTranslations("externalApi");
  const tc = useTranslations("common");
  const saveProfile = useSaveExternalApiParamProfile(systemId);
  const testTableList = useTestExternalTableListApi(systemId);
  const [tableListParamsText, setTableListParamsText] = useState(
    toJsonText(profile?.tableListParams),
  );
  const [tableListTest, setTableListTest] = useState<TestState>({});
  const [errors, setErrors] = useState({
    tableList: false,
  });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const tableList = parseJsonObject(tableListParamsText);

    setErrors({
      tableList: tableList.invalid,
    });

    if (tableList.invalid) {
      return;
    }

    await saveProfile.mutateAsync({
      tableListParams: tableList.value,
      headerOverrides: null,
      isActive: true,
    });
    toast.success(t("profileSaved"));
  };

  const handleTableListTest = async () => {
    setTableListTest({});
    try {
      const result = await testTableList.mutateAsync();
      setTableListTest({ result });
    } catch (error) {
      setTableListTest({
        error:
          error instanceof ApiError
            ? error.message
            : error instanceof Error
              ? error.message
              : t("testFailed"),
      });
    }
  };

  return (
    <form className="space-y-4 p-4" onSubmit={handleSubmit}>
      <p className="text-sm text-muted-foreground">{t("profileSettingsDescription")}</p>
      <Field label={t("tableListParams")}>
        <Textarea
          value={tableListParamsText}
          onChange={(event) => {
            setTableListParamsText(event.target.value);
            setErrors((prev) => ({ ...prev, tableList: false }));
          }}
          className="min-h-28 font-mono text-xs"
          placeholder={TABLE_LIST_PARAMS_PLACEHOLDER}
          aria-invalid={errors.tableList}
        />
        {errors.tableList ? (
          <p className="text-xs text-destructive">{t("invalidJson")}</p>
        ) : (
          <p className="text-xs text-muted-foreground">{t("tableListParamsHelp")}</p>
        )}
      </Field>
      <div className="space-y-4 rounded-lg border bg-muted/20 p-4">
        <div>
          <h3 className="font-semibold">{t("connectionTest")}</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("connectionTestDescription")}
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-sm font-medium">{t("tableListTest")}</div>
              <p className="text-xs text-muted-foreground">
                {t("tableListTestDescription")}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleTableListTest()}
              disabled={testTableList.isPending}
            >
              {testTableList.isPending ? t("testing") : t("test")}
            </Button>
          </div>
          <TestResultPanel state={tableListTest} />
        </div>
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={saveProfile.isPending}>
          {tc("save")}
        </Button>
      </div>
    </form>
  );
};

const TestResultPanel = ({ state }: { state: TestState }) => {
  const t = useTranslations("externalApi");

  if (!state.result && !state.error) {
    return null;
  }

  if (state.error) {
    return (
      <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
        <div className="font-medium">{t("testFailed")}</div>
        <p className="mt-1 break-words text-xs">{state.error}</p>
      </div>
    );
  }

  const result = state.result;
  if (!result) {
    return null;
  }

  return (
    <div className="rounded-md border bg-background p-3 text-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-primary">{t("testSucceeded")}</span>
        <Badge variant="secondary">
          {t("resultCount", { count: result.count })}
        </Badge>
      </div>
      <pre className="mt-2 max-h-48 overflow-auto rounded bg-muted p-2 text-xs">
        {JSON.stringify(result.sample, null, 2)}
      </pre>
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
