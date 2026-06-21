"use client";

import { Building2, RefreshCw } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { useDebounce } from "@/hooks/useDebounce";
import {
  useOrganizations,
  useSyncOrganizations,
} from "@/lib/query/hooks/useOrganizations";
import type { OrganizationDto, OrganizationSyncResult } from "@/types/organization";

/** HR ERP 기반 조직 마스터 조회·동기화 */
export const OrganizationMasterManagement = () => {
  const t = useTranslations("organizations");
  const tc = useTranslations("common");
  const [search, setSearch] = useState("");
  const [lastSyncResult, setLastSyncResult] =
    useState<OrganizationSyncResult | null>(null);
  const debouncedSearch = useDebounce(search, 300);

  const { data: organizations, isLoading, isError, refetch } =
    useOrganizations({
      search: debouncedSearch,
      isActive: true,
    });
  const syncOrganizations = useSyncOrganizations();

  const handleSync = async () => {
    const result = await syncOrganizations.mutateAsync();
    setLastSyncResult(result);
  };

  const columns = useMemo<DataGridColumn<OrganizationDto>[]>(
    () => [
      {
        key: "orgCode",
        header: t("orgCode"),
        sortable: true,
        filter: "text",
        value: (row) => row.orgCode,
        cell: (row) => row.orgCode,
      },
      {
        key: "orgName",
        header: t("orgName"),
        sortable: true,
        filter: "text",
        value: (row) => row.orgName,
        cell: (row) => row.orgName,
      },
      {
        key: "costCd",
        header: t("costCenter"),
        sortable: true,
        filter: "text",
        value: (row) => row.costCd ?? "",
        cell: (row) => row.costCd ?? "-",
      },
      {
        key: "costName",
        header: t("costCenterName"),
        sortable: true,
        filter: "text",
        value: (row) => row.costName ?? "",
        cell: (row) => row.costName ?? "-",
      },
      {
        key: "orgLevel",
        header: t("orgLevel"),
        sortable: true,
        value: (row) => row.orgLevel ?? "",
        cell: (row) => row.orgLevel ?? "-",
      },
      {
        key: "buCd",
        header: t("buCd"),
        sortable: true,
        filter: "text",
        value: (row) => row.buCd ?? "",
        cell: (row) => row.buCd ?? "-",
      },
      {
        key: "leaderName",
        header: t("leaderName"),
        value: (row) => row.leaderName ?? "",
        cell: (row) => row.leaderName ?? "-",
      },
    ],
    [t],
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
        icon={Building2}
        actions={
          <PageActions
            showSearch={false}
            showRegister={false}
            className="gap-2"
          />
        }
      />
      <ListPageBody
        filterStorageKey="pams-organization-master-filter-panel-width"
        filter={
          <FilterPanel>
            <FilterField label={t("searchPlaceholder")}>
              <SearchBar
                value={search}
                onChange={setSearch}
                placeholder={t("searchPlaceholder")}
              />
            </FilterField>
            <FilterField label={t("syncFromHr")}>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={syncOrganizations.isPending}
                onClick={() => void handleSync()}
              >
                <RefreshCw
                  className={
                    syncOrganizations.isPending ? "size-4 animate-spin" : "size-4"
                  }
                />
                {t("syncFromHr")}
              </Button>
            </FilterField>
          </FilterPanel>
        }
        content={
          <PageContent>
            {lastSyncResult ? (
              <p className="mb-3 text-sm text-muted-foreground">
                {t("syncResult", {
                  total: lastSyncResult.totalFetched,
                  inserted: lastSyncResult.inserted,
                  updated: lastSyncResult.updated,
                  deactivated: lastSyncResult.deactivated,
                })}
              </p>
            ) : null}
            <DataGrid
              title={t("title")}
              count={organizations?.length ?? 0}
              countSuffix={tc("countUnit")}
              icon
              columns={columns}
              data={organizations ?? []}
              rowKey={(row) => row.orgId}
              storageKey="pams-organization-master-grid-v2"
              emptyMessage={t("emptyOrganizations")}
              fillHeight
            />
          </PageContent>
        }
      />
    </ListPageLayout>
  );
};
