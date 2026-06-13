"use client";

import { ClipboardList, ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";

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
import { StatusBadge } from "@/components/common/StatusBadge";
import { TaskAttributeForm } from "@/components/metadata/TaskAttributeForm";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useDebounce } from "@/hooks/useDebounce";
import { Link } from "@/lib/i18n/navigation";
import { useTaskAttributeList } from "@/lib/query/hooks/useMetadata";
import type { TaskAttributeListItem } from "@/types/metadata";

/** BPMN에서 등록한 Task 속성 목록 */
export const TaskAttributeList = () => {
  const t = useTranslations("metadata");
  const tc = useTranslations("common");
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState<"ALL" | "L3" | "L4">("ALL");
  const [detailNodeId, setDetailNodeId] = useState<number | null>(null);
  const sheetBodyRef = useRef<HTMLDivElement>(null);
  const debouncedSearch = useDebounce(search, 300);

  const filters = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      level: levelFilter === "ALL" ? undefined : levelFilter,
    }),
    [debouncedSearch, levelFilter],
  );
  const levelFilterLabel =
    levelFilter === "ALL" ? t("allLevels") : levelFilter;

  const { data: items, isLoading, error, refetch } = useTaskAttributeList(filters);

  const selectedItem = useMemo(
    () => items?.find((item) => item.nodeId === detailNodeId) ?? null,
    [detailNodeId, items],
  );

  const listColumns = useMemo<DataGridColumn<TaskAttributeListItem>[]>(
    () => [
      {
        key: "no",
        header: "No.",
        width: 48,
        minWidth: 44,
        align: "center",
        cell: (_item, rowIndex) => rowIndex + 1,
      },
      {
        key: "processCode",
        header: t("processCode"),
        width: 120,
        minWidth: 96,
        sortable: true,
        filter: "text",
        value: (item) => item.processCode,
        cell: (item) => (
          <span className="font-mono text-[11px]">{item.processCode}</span>
        ),
      },
      {
        key: "processName",
        header: t("processName"),
        width: 180,
        minWidth: 140,
        sortable: true,
        filter: "text",
        value: (item) => item.processName,
        cell: (item) => (
          <span className="truncate font-medium">{item.processName}</span>
        ),
      },
      {
        key: "processLevel",
        header: t("level"),
        width: 52,
        minWidth: 44,
        align: "center",
        sortable: true,
        filter: "select",
        value: (item) => item.processLevel,
        cell: (item) => item.processLevel,
      },
      {
        key: "parentCode",
        header: t("parentCode"),
        width: 120,
        minWidth: 96,
        sortable: true,
        filter: "text",
        value: (item) => item.parentCode ?? "",
        cell: (item) =>
          item.parentCode ? (
            <span className="truncate font-mono text-[11px]">
              {item.parentCode}
            </span>
          ) : (
            "-"
          ),
      },
      {
        key: "parentName",
        header: t("parentName"),
        width: 140,
        minWidth: 120,
        sortable: true,
        filter: "text",
        value: (item) => item.parentName ?? "",
        cell: (item) => (
          <span className="truncate">{item.parentName ?? "-"}</span>
        ),
      },
      {
        key: "definition",
        header: t("definition"),
        width: 200,
        minWidth: 160,
        sortable: true,
        filter: "text",
        value: (item) => item.definition ?? "",
        cell: (item) => (
          <span className="line-clamp-2">{item.definition || "-"}</span>
        ),
      },
      {
        key: "purpose",
        header: t("purpose"),
        width: 160,
        minWidth: 120,
        sortable: true,
        filter: "text",
        value: (item) => item.purpose ?? "",
        cell: (item) => (
          <span className="line-clamp-2">{item.purpose ?? "-"}</span>
        ),
      },
      {
        key: "bpmnModel",
        header: t("bpmnModel"),
        width: 160,
        minWidth: 120,
        sortable: true,
        filter: "text",
        value: (item) => item.bpmnModelName ?? "",
        cell: (item) =>
          item.bpmnModelId ? (
            <Link
              href={`/bpmn/${item.bpmnModelId}`}
              className="inline-flex max-w-full items-center gap-1 truncate text-primary hover:underline"
            >
              <span className="truncate">{item.bpmnModelName}</span>
              <ExternalLink className="size-3 shrink-0" />
            </Link>
          ) : (
            <span className="text-slate-500">-</span>
          ),
      },
      {
        key: "bpmnElement",
        header: t("bpmnElement"),
        width: 140,
        minWidth: 100,
        sortable: true,
        filter: "text",
        value: (item) => item.bpmnElementName ?? "",
        cell: (item) => (
          <span className="truncate">{item.bpmnElementName ?? "-"}</span>
        ),
      },
      {
        key: "frequency",
        header: t("frequency"),
        width: 96,
        minWidth: 80,
        sortable: true,
        filter: "select",
        value: (item) => item.frequency ?? "",
        cell: (item) =>
          item.frequency ? t(`frequencyOptions.${item.frequency}`) : "-",
      },
      {
        key: "status",
        header: t("listStatus"),
        width: 100,
        minWidth: 88,
        sortable: true,
        filter: "select",
        value: (item) => item.processStatus,
        cell: (item) => <StatusBadge status={item.processStatus} />,
      },
      {
        key: "updatedAt",
        header: t("listUpdatedAt"),
        width: 108,
        minWidth: 96,
        sortable: true,
        filter: "text",
        value: (item) => item.updatedAt?.toISOString() ?? "",
        cell: (item) =>
          item.updatedAt
            ? new Intl.DateTimeFormat(undefined, {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
              }).format(new Date(item.updatedAt))
            : "-",
      },
      {
        key: "actions",
        header: t("listActions"),
        width: 108,
        minWidth: 96,
        align: "center",
        cell: (item) => (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-6 px-2 text-[11px]"
            onClick={(event) => {
              event.stopPropagation();
              setDetailNodeId(item.nodeId);
            }}
          >
            <ClipboardList className="mr-1 size-3.5" />
            {t("viewDetail")}
          </Button>
        ),
      },
    ],
    [t],
  );

  useEffect(() => {
    sheetBodyRef.current?.scrollTo({ top: 0, behavior: "instant" });
  }, [detailNodeId]);

  if (isLoading) {
    return <LoadingSpinner label={t("loading")} className="min-h-[50vh]" />;
  }

  if (error) {
    return (
      <EmptyState
        title={t("loadError")}
        action={
          <Button variant="outline" onClick={() => void refetch()}>
            {t("retry")}
          </Button>
        }
        className="min-h-[50vh]"
      />
    );
  }

  return (
    <ListPageLayout>
      <PageHeader
        title={t("listTitle")}
        description={t("listDesc")}
        icon={ClipboardList}
        actions={
          <PageActions
            onSearch={() => void refetch()}
            showRegister={false}
          />
        }
      />
      <ListPageBody
        filter={
          <FilterPanel>
            <FilterField label={t("listSearchPlaceholder")}>
              <SearchBar
                value={search}
                onChange={setSearch}
                placeholder={t("listSearchPlaceholder")}
              />
            </FilterField>
            <FilterField label={t("levelFilter")}>
              <Select
                value={levelFilter}
                onValueChange={(value) =>
                  value && setLevelFilter(value as "ALL" | "L3" | "L4")
                }
              >
                <SelectTrigger variant="filter">
                  <SelectValue>{levelFilterLabel}</SelectValue>
                </SelectTrigger>
                <SelectContent variant="filter">
                  <SelectItem variant="filter" value="ALL">{t("allLevels")}</SelectItem>
                  <SelectItem variant="filter" value="L3">L3</SelectItem>
                  <SelectItem variant="filter" value="L4">L4</SelectItem>
                </SelectContent>
              </Select>
            </FilterField>
          </FilterPanel>
        }
        content={
          <PageContent>
            <DataGrid
              title={t("listTitle")}
              count={items?.length ?? 0}
              countSuffix={tc("countUnit")}
              icon
              columns={listColumns}
              data={items ?? []}
              rowKey={(item) => item.attrId}
              storageKey="pams-task-attributes-grid"
              emptyMessage={t("listEmpty")}
              onRowClick={(item) => setDetailNodeId(item.nodeId)}
              fillHeight
            />
          </PageContent>
        }
      />

      <Sheet
        open={detailNodeId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDetailNodeId(null);
            void refetch();
          }
        }}
      >
        <SheetContent
          className="flex h-full !w-[min(800px,96vw)] !max-w-none flex-col gap-0 overflow-hidden p-0 sm:!max-w-none"
          showCloseButton
        >
          <SheetHeader className="shrink-0 border-b px-6 py-4">
            <SheetTitle className="truncate text-base font-semibold">
              {selectedItem
                ? `${selectedItem.processCode} — ${selectedItem.processName}`
                : t("listTitle")}
            </SheetTitle>
            <SheetDescription className="line-clamp-2">
              {selectedItem?.bpmnElementName
                ? t("detailSheetDescWithBpmn", {
                    model: selectedItem.bpmnModelName ?? "",
                    task: selectedItem.bpmnElementName,
                  })
                : t("detailSheetDesc")}
            </SheetDescription>
          </SheetHeader>

          <div
            ref={sheetBodyRef}
            className="min-h-0 flex-1 overflow-y-auto px-6 pb-6 pt-4"
          >
            {detailNodeId !== null && (
              <TaskAttributeForm
                key={detailNodeId}
                nodeId={detailNodeId}
                variant="sheet"
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </ListPageLayout>
  );
};
