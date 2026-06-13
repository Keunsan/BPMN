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
import { useTaskSystemMappings } from "@/lib/query/hooks/useSystems";
import { Link } from "@/lib/i18n/navigation";
import { cn } from "@/lib/utils";
import type { TaskDataTableLinkDto } from "@/types/data-table";
import type { TaskSystemMappingDto } from "@/types/system";

type TaskLinkedResourcesSummaryProps = {
  nodeId: number;
};

/** Task에 연결된 시스템 화면·데이터 테이블을 읽기 전용으로 표시 */
export const TaskLinkedResourcesSummary = ({
  nodeId,
}: TaskLinkedResourcesSummaryProps) => {
  const t = useTranslations("metadata");
  const tm = useTranslations("menu");
  const ts = useTranslations("systemMapping");
  const td = useTranslations("dataLink");

  const { data: mappings, isLoading: mappingsLoading } =
    useTaskSystemMappings(nodeId);
  const { data: links, isLoading: linksLoading } = useTaskDataTableLinks(nodeId);

  const mappingColumns = useMemo<DataGridColumn<TaskSystemMappingDto>[]>(
    () => [
      {
        key: "system",
        header: ts("system"),
        width: 96,
        minWidth: 80,
        cell: (mapping) => (
          <span className="truncate">{mapping.systemName}</span>
        ),
      },
      {
        key: "module",
        header: ts("module"),
        width: 72,
        minWidth: 60,
        cell: (mapping) => (
          <span className="font-mono text-[11px]">{mapping.moduleCode}</span>
        ),
      },
      {
        key: "menuId",
        header: ts("menuId"),
        width: 96,
        minWidth: 80,
        cell: (mapping) => (
          <span className="font-mono text-[11px]">{mapping.menuId}</span>
        ),
      },
      {
        key: "screen",
        header: ts("screen"),
        width: 160,
        minWidth: 120,
        cell: (mapping) => (
          <span className="truncate">{mapping.screenName}</span>
        ),
      },
      {
        key: "usageType",
        header: ts("usageType"),
        width: 80,
        minWidth: 64,
        align: "center",
        cell: (mapping) => (
          <Badge className="h-5 px-1.5 text-[10px]">
            {ts(`usageTypes.${mapping.usageType}`)}
          </Badge>
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
          <span className="truncate font-mono text-[11px]">
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
          <Badge className="h-5 px-1.5 text-[10px]">
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

  if (mappingsLoading || linksLoading) {
    return <LoadingSpinner className="min-h-[120px]" />;
  }

  const mappingItems = mappings ?? [];
  const linkItems = links ?? [];
  const hasMappings = mappingItems.length > 0;
  const hasLinks = linkItems.length > 0;

  if (!hasMappings && !hasLinks) {
    return (
      <EmptyState title={t("systemSeparate")} action={manageLinks} />
    );
  }

  return (
    <div className="space-y-4">
      <div className={cn(pamsContentPanelClass)}>
        <PanelTitleBar
          title={ts("linkedSystems")}
          count={mappingItems.length}
        />
        <DataGrid
          embedded
          columns={mappingColumns}
          data={mappingItems}
          rowKey={(mapping) => mapping.mappingId}
          emptyMessage={ts("emptyMappings")}
          resizable={false}
          fillHeight={false}
        />

        <div className="border-t border-slate-200/80 dark:border-slate-600/60">
          <PanelTitleBar
            title={td("linkedTables")}
            count={linkItems.length}
          />
        </div>
        <DataGrid
          embedded
          columns={linkColumns}
          data={linkItems}
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
