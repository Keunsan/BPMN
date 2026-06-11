"use client";

import { GitCompareArrows } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBpmnList, useCompareBpmn } from "@/lib/query/hooks/useBpmn";
import type { BpmnCompareResult, BpmnElementDiff } from "@/types/bpmn";

import { BpmnViewer } from "./BpmnViewer";

/** BPMN 버전 비교 — 좌우 분할 + diff 목록 */
export const BpmnCompareView = () => {
  const t = useTranslations("bpmn");
  const { data: models, isLoading } = useBpmnList({});
  const compareMutation = useCompareBpmn();

  const [leftId, setLeftId] = useState<string>("");
  const [rightId, setRightId] = useState<string>("");
  const [result, setResult] = useState<BpmnCompareResult | null>(null);

  const effectiveLeftId =
    leftId || (models?.[0] ? String(models[0].modelId) : "");
  const effectiveRightId =
    rightId || (models?.[1] ? String(models[1].modelId) : "");
  const leftModel = models?.find((model) => String(model.modelId) === effectiveLeftId);
  const rightModel = models?.find((model) => String(model.modelId) === effectiveRightId);

  const handleCompare = async () => {
    if (!effectiveLeftId || !effectiveRightId || effectiveLeftId === effectiveRightId) {
      return;
    }

    const data = await compareMutation.mutateAsync({
      leftModelId: Number(effectiveLeftId),
      rightModelId: Number(effectiveRightId),
    });
    setResult(data);
  };

  if (isLoading) {
    return <LoadingSpinner label={t("loading")} />;
  }

  if (!models?.length) {
    return <EmptyState title={t("emptyCompare")} />;
  }

  const leftDiff = result?.diff.filter((d) => d.changeType !== "added") ?? [];
  const rightDiff = result?.diff.filter((d) => d.changeType !== "removed") ?? [];

  return (
    <ListPageLayout>
      <PageHeader
        title={t("compareTitle")}
        description={t("listDesc")}
        icon={GitCompareArrows}
        actions={
          <PageActions
            showRegister={false}
            onSearch={() => void handleCompare()}
            searchLabel={compareMutation.isPending ? t("comparing") : t("compare")}
            searchDisabled={
              !effectiveLeftId ||
              !effectiveRightId ||
              effectiveLeftId === effectiveRightId ||
              compareMutation.isPending
            }
          />
        }
      />
      <ListPageBody
        filter={
          <FilterPanel>
            <FilterField label={t("leftVersion")}>
              <Select
                value={effectiveLeftId}
                onValueChange={(v) => v && setLeftId(v)}
              >
                <SelectTrigger variant="filter">
                  <SelectValue>
                    {leftModel
                      ? `${leftModel.modelName} v${leftModel.version}`
                      : undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent variant="filter">
                  {models.map((m) => (
                    <SelectItem variant="filter" key={m.modelId} value={String(m.modelId)}>
                      {m.modelName} v{m.version}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterField>
            <FilterField label={t("rightVersion")}>
              <Select
                value={effectiveRightId}
                onValueChange={(v) => v && setRightId(v)}
              >
                <SelectTrigger variant="filter">
                  <SelectValue>
                    {rightModel
                      ? `${rightModel.modelName} v${rightModel.version}`
                      : undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent variant="filter">
                  {models.map((m) => (
                    <SelectItem variant="filter" key={m.modelId} value={String(m.modelId)}>
                      {m.modelName} v{m.version}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterField>
          </FilterPanel>
        }
        content={
          <PageContent>
            <ContentPanel title={t("compareTitle")} icon bodyClassName="space-y-4 p-4">
              {result && (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  {result.left.modelName} v{result.left.version}
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[420px] p-0">
                <BpmnViewer
                  xml={result.left.bpmnXml}
                  highlightDiff={leftDiff}
                />
              </CardContent>
            </Card>
            <Card className="overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  {result.right.modelName} v{result.right.version}
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[420px] p-0">
                <BpmnViewer
                  xml={result.right.bpmnXml}
                  highlightDiff={rightDiff}
                />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("diffSummary")}</CardTitle>
            </CardHeader>
            <CardContent>
              {result.diff.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("noDiff")}</p>
              ) : (
                <ul className="space-y-2">
                  {result.diff.map((item, idx) => (
                    <DiffItem key={`${item.elementBpmnId}-${idx}`} item={item} />
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
            </>
              )}
            </ContentPanel>
          </PageContent>
        }
      />
    </ListPageLayout>
  );
};

const DiffItem = ({ item }: { item: BpmnElementDiff }) => {
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
