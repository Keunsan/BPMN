"use client";

import { ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo } from "react";

import { DataGrid, type DataGridColumn } from "@/components/common/DataGrid";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { PanelTitleBar } from "@/components/common/layout/PanelTitleBar";
import { pamsContentPanelClass } from "@/components/common/layout/panel-styles";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTaskDataTableLinks } from "@/lib/query/hooks/useExternalTables";
import { useTaskSystemLinks } from "@/lib/query/hooks/useSystems";
import { Link } from "@/lib/i18n/navigation";
import { cn } from "@/lib/utils";
import type { TaskDataTableLinkDto } from "@/types/data-table";
import type {
  TaskSystemLinkDto,
  TaskSystemScreenLinkDto,
} from "@/types/system";

type TaskLinkedResourcesSummaryProps = {
  nodeId: number;
};

/** Task에 연결된 시스템·화면·데이터 테이블을 읽기 전용으로 표시 */
export const TaskLinkedResourcesSummary = ({
  nodeId,
}: TaskLinkedResourcesSummaryProps) => {
  const t = useTranslations("metadata");
  const tm = useTranslations("menu");
  const ts = useTranslations("systemMapping");
  const td = useTranslations("dataLink");

  const { data: links, isLoading: linksLoading } = useTaskSystemLinks(nodeId);
  const { data: tableLinks, isLoading: tableLinksLoading } =
    useTaskDataTableLinks(nodeId);

  const systemColumns = useMemo<DataGridColumn<TaskSystemLinkDto>[]>(
    () => [
      {
        key: "company",
        header: ts("company"),
        width: 96,
        minWidth: 72,
        cell: (link) => (
          <span className="truncate">
            {link.companyName ?? link.companyCode ?? "-"}
          </span>
        ),
      },
      {
        key: "businessUnit",
        header: ts("businessUnit"),
        width: 96,
        minWidth: 72,
        cell: (link) => (
          <span className="truncate">
            {link.businessUnitName ?? link.businessUnitCode ?? "-"}
          </span>
        ),
      },
      {
        key: "system",
        header: ts("system"),
        width: 120,
        minWidth: 96,
        cell: (link) => <span className="truncate">{link.systemName}</span>,
      },
      {
        key: "primary",
        header: ts("primary"),
        width: 72,
        minWidth: 60,
        align: "center",
        cell: (link) =>
          link.isPrimary ? (
            <Badge className="h-5 px-1.5 text-xs">{ts("primaryYes")}</Badge>
          ) : (
            <span className="text-muted-foreground">-</span>
          ),
      },
      {
        key: "screenCount",
        header: ts("screenCount"),
        width: 64,
        minWidth: 52,
        align: "center",
        cell: (link) => <span>{link.screenCount}</span>,
      },
    ],
    [ts],
  );

  const screenRows = useMemo(
    () =>
      (links ?? []).flatMap((link) =>
        link.screens.map((screen) => ({
          ...screen,
          systemName: link.systemName,
        })),
      ),
    [links],
  );

  const screenColumns = useMemo<
    DataGridColumn<TaskSystemScreenLinkDto & { systemName: string }>[]
  >(
    () => [
      {
        key: "system",
        header: ts("system"),
        width: 120,
        minWidth: 96,
        cell: (screen) => (
          <span className="truncate">{screen.systemName}</span>
        ),
      },
      {
        key: "module",
        header: ts("module"),
        width: 72,
        minWidth: 60,
        cell: (screen) => (
          <span className="font-mono text-sm">{screen.moduleCode}</span>
        ),
      },
      {
        key: "menuId",
        header: ts("menuId"),
        width: 96,
        minWidth: 80,
        cell: (screen) => (
          <span className="font-mono text-sm">{screen.menuId}</span>
        ),
      },
      {
        key: "screen",
        header: ts("screen"),
        width: 160,
        minWidth: 120,
        cell: (screen) => (
          <span className="truncate">{screen.screenName}</span>
        ),
      },
    ],
    [ts],
  );

  const linkColumns = useMemo<DataGridColumn<TaskDataTableLinkDto>[]>(
    () => [
      {
        key: "system",
        header: td("system"),
        width: 120,
        minWidth: 96,
        cell: (link) => <span className="truncate">{link.systemName}</span>,
      },
      {
        key: "tableName",
        header: td("table"),
        width: 160,
        minWidth: 120,
        cell: (link) => (
          <span className="truncate font-mono text-sm">
            {link.schemaName ? `${link.schemaName}.` : ""}
            {link.tableName}
          </span>
        ),
      },
      {
        key: "tableNameKor",
        header: td("tableNameKor"),
        width: 120,
        minWidth: 96,
        cell: (link) => (
          <span className="truncate">{link.tableNameKor ?? "-"}</span>
        ),
      },
      {
        key: "linkType",
        header: td("linkType"),
        width: 88,
        minWidth: 72,
        cell: (link) => (
          <Badge className="h-5 px-1.5 text-xs">
            {td(`linkTypes.${link.linkType}`)}
          </Badge>
        ),
      },
      {
        key: "crudType",
        header: td("crudType"),
        width: 72,
        minWidth: 60,
        align: "center",
        cell: (link) => link.crudType ?? "-",
      },
    ],
    [td],
  );

  const manageLinks = (
    <div className="flex flex-wrap justify-center gap-2">
      <Button type="button" variant="outline" size="sm" render={<Link href="/metadata/system" />}>
        <ExternalLink className="size-3.5" />
        {tm("systemLink")}
      </Button>
      <Button type="button" variant="outline" size="sm" render={<Link href="/data/link" />}>
        <ExternalLink className="size-3.5" />
        {tm("dataLink")}
      </Button>
    </div>
  );

  if (linksLoading || tableLinksLoading) {
    return <LoadingSpinner className="min-h-[120px]" />;
  }

  const systemItems = links ?? [];
  const tableLinkItems = tableLinks ?? [];
  const hasSystems = systemItems.length > 0;
  const hasScreens = screenRows.length > 0;
  const hasTableLinks = tableLinkItems.length > 0;

  if (!hasSystems && !hasTableLinks) {
    return (
      <EmptyState title={t("systemSeparate")} action={manageLinks} />
    );
  }

  return (
    <div className="space-y-4">
      <div className={cn(pamsContentPanelClass)}>
        <PanelTitleBar
          title={ts("linkedSystems")}
          count={systemItems.length}
        />
        <DataGrid
          embedded
          columns={systemColumns}
          data={systemItems}
          rowKey={(link) => link.linkId}
          emptyMessage={ts("emptyMappings")}
          resizable={false}
          fillHeight={false}
        />

        {hasScreens ? (
          <>
            <div className="border-t border-slate-200/80 dark:border-slate-600/60">
              <PanelTitleBar
                title={ts("linkedScreens")}
                count={screenRows.length}
              />
            </div>
            <DataGrid
              embedded
              columns={screenColumns}
              data={screenRows}
              rowKey={(screen) => screen.screenLinkId}
              emptyMessage={ts("emptyLinkedScreens")}
              resizable={false}
              fillHeight={false}
            />
          </>
        ) : null}

        <div className="border-t border-slate-200/80 dark:border-slate-600/60">
          <PanelTitleBar
            title={td("linkedTables")}
            count={tableLinkItems.length}
          />
        </div>
        <DataGrid
          embedded
          columns={linkColumns}
          data={tableLinkItems}
          rowKey={(link) => link.linkId}
          emptyMessage={td("emptyLinks")}
          resizable={false}
          fillHeight={false}
        />
      </div>

      <p className="text-center text-xs text-muted-foreground">
        {t("systemSeparate")}
      </p>
      {manageLinks}
    </div>
  );
};
