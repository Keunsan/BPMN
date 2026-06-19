"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { DataGrid, type DataGridColumn } from "@/components/common/DataGrid";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { BpmnViewer } from "@/components/bpmn/BpmnViewer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBpmnDetail } from "@/lib/query/hooks/useBpmn";
import { cn } from "@/lib/utils";
import type { BpmnElementDiff } from "@/types/bpmn";
import type { StandardVariantCompareDto } from "@/types/process";

type StandardVariantCompareProps = {
  data?: StandardVariantCompareDto;
  isLoading?: boolean;
};

type DiffRow = StandardVariantCompareDto["diffRows"][number];

const BpmnDiffItem = ({ item }: { item: BpmnElementDiff }) => {
  const t = useTranslations("bpmn");

  const colorClass =
    item.changeType === "added"
      ? "text-green-600"
      : item.changeType === "removed"
        ? "text-red-600"
        : "text-amber-600";

  return (
    <li className="flex flex-wrap items-center gap-2 text-sm">
      <span className={`font-medium ${colorClass}`}>
        {t(`diff.${item.changeType}`)}
      </span>
      <span className="font-mono text-xs">{item.elementBpmnId}</span>
      {item.elementName && (
        <span className="text-muted-foreground">({item.elementName})</span>
      )}
      {item.field && (
        <span className="text-muted-foreground">
          {item.field}: {item.oldValue ?? "-"} → {item.newValue ?? "-"}
        </span>
      )}
    </li>
  );
};

const StandardVariantBpmnCompare = ({
  data,
}: {
  data: StandardVariantCompareDto;
}) => {
  const t = useTranslations("process");
  const tb = useTranslations("bpmn");
  const bpmnCompare = data.bpmnCompare;
  const standardModelId = bpmnCompare?.standardModelId ?? 0;
  const variantModelId = bpmnCompare?.variantModelId ?? 0;

  const { data: standardModel, isLoading: isStandardLoading } =
    useBpmnDetail(standardModelId);
  const { data: variantModel, isLoading: isVariantLoading } =
    useBpmnDetail(variantModelId);

  if (!bpmnCompare?.standardModelId && !bpmnCompare?.variantModelId) {
    return (
      <EmptyState
        title={t("variant.compareNoBpmn")}
        description={t("variant.compareNoBpmnDesc")}
      />
    );
  }

  if (isStandardLoading || isVariantLoading) {
    return <LoadingSpinner label={t("loading")} />;
  }

  const diff = bpmnCompare?.diff ?? [];
  const leftDiff = diff.filter((item) => item.changeType !== "added");
  const rightDiff = diff.filter((item) => item.changeType !== "removed");

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {standardModel?.modelName ?? data.standard.code}
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[360px] p-0">
            {standardModel?.bpmnXml ? (
              <BpmnViewer xml={standardModel.bpmnXml} highlightDiff={leftDiff} />
            ) : (
              <EmptyState title={t("variant.compareNoBpmn")} className="py-12" />
            )}
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {variantModel?.modelName ?? data.variant?.code}
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[360px] p-0">
            {variantModel?.bpmnXml ? (
              <BpmnViewer xml={variantModel.bpmnXml} highlightDiff={rightDiff} />
            ) : (
              <EmptyState title={t("variant.compareNoBpmn")} className="py-12" />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{tb("diffSummary")}</CardTitle>
        </CardHeader>
        <CardContent>
          {diff.length === 0 ? (
            <p className="text-sm text-muted-foreground">{tb("noDiff")}</p>
          ) : (
            <ul className="space-y-2">
              {diff.map((item, idx) => (
                <BpmnDiffItem key={`${item.elementBpmnId}-${idx}`} item={item} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

/** 표준·변형 필드 및 BPMN 비교 */
export const StandardVariantCompare = ({
  data,
  isLoading,
}: StandardVariantCompareProps) => {
  const t = useTranslations("process");
  const [activeTab, setActiveTab] = useState("metadata");

  const columns = useMemo<DataGridColumn<DiffRow>[]>(
    () => [
      {
        key: "field",
        header: t("field"),
        width: 140,
        minWidth: 120,
        sticky: "left",
        sortable: true,
        filter: "text",
        value: (row) => row.key,
        cell: (row) => (
          <span className="font-mono text-sm">{row.key}</span>
        ),
      },
      {
        key: "standard",
        header: t("variant.standardColumn"),
        width: 240,
        minWidth: 180,
        sortable: true,
        filter: "text",
        value: (row) => row.standardValue,
        cell: (row) => (
          <span
            className={cn(
              row.changed &&
                "rounded bg-amber-50 px-1 py-0.5 dark:bg-amber-950/20",
            )}
          >
            {row.standardValue}
          </span>
        ),
      },
      {
        key: "variant",
        header: t("variant.variantColumn"),
        width: 240,
        minWidth: 180,
        sortable: true,
        filter: "text",
        value: (row) => row.variantValue,
        cell: (row) => (
          <span
            className={cn(
              row.changed &&
                "rounded bg-amber-50 px-1 py-0.5 dark:bg-amber-950/20",
            )}
          >
            {row.variantValue}
          </span>
        ),
      },
    ],
    [t],
  );

  if (isLoading) {
    return <LoadingSpinner label={t("loading")} />;
  }

  if (!data) {
    return (
      <EmptyState
        title={t("variant.compareSelectScope")}
        description={t("variant.compareSelectScopeDesc")}
      />
    );
  }

  if (!data.variant) {
    return (
      <EmptyState
        title={t("variant.compareNoVariant")}
        description={t("variant.compareNoVariantDesc")}
      />
    );
  }

  const showBpmnTab = data.standard.level === "L3";

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {t("variant.compareTitle", {
            standardCode: data.standard.code,
            variantCode: data.variant.code,
          })}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="metadata">{t("variant.compareTabMetadata")}</TabsTrigger>
            {showBpmnTab && (
              <TabsTrigger value="bpmn">{t("variant.compareTabBpmn")}</TabsTrigger>
            )}
          </TabsList>
          <TabsContent value="metadata" className="mt-4">
            <DataGrid
              columns={columns}
              data={data.diffRows}
              rowKey={(row) => row.key}
              storageKey="pams-standard-variant-compare-grid"
            />
          </TabsContent>
          {showBpmnTab && (
            <TabsContent value="bpmn" className="mt-4">
              <StandardVariantBpmnCompare data={data} />
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
};
