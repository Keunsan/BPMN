"use client";

import { ClipboardList, ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";

import { EmptyState } from "@/components/common/EmptyState";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
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

/** BPMN에서 등록한 Task 속성 목록 */
export const TaskAttributeList = () => {
  const t = useTranslations("metadata");
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

  const { data: items, isLoading, error, refetch } = useTaskAttributeList(filters);

  const selectedItem = useMemo(
    () => items?.find((item) => item.nodeId === detailNodeId) ?? null,
    [detailNodeId, items],
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
    <div className="space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t("listTitle")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("listDesc")}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder={t("listSearchPlaceholder")}
          className="max-w-md flex-1"
        />
        <Select
          value={levelFilter}
          onValueChange={(value) =>
            value && setLevelFilter(value as "ALL" | "L3" | "L4")
          }
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t("allLevels")}</SelectItem>
            <SelectItem value="L3">L3</SelectItem>
            <SelectItem value="L4">L4</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {!items?.length ? (
        <EmptyState
          title={t("listEmpty")}
          description={t("listEmptyDesc")}
          className="min-h-[40vh]"
        />
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full min-w-[960px] text-sm">
            <thead className="border-b bg-muted/40 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">{t("processCode")}</th>
                <th className="px-4 py-3 font-medium">{t("processName")}</th>
                <th className="px-4 py-3 font-medium">{t("parentProcess")}</th>
                <th className="px-4 py-3 font-medium">{t("definition")}</th>
                <th className="px-4 py-3 font-medium">{t("bpmnModel")}</th>
                <th className="px-4 py-3 font-medium">{t("frequency")}</th>
                <th className="px-4 py-3 font-medium">{t("listStatus")}</th>
                <th className="px-4 py-3 font-medium">{t("listUpdatedAt")}</th>
                <th className="px-4 py-3 font-medium">{t("listActions")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.attrId}
                  className="border-b last:border-b-0 hover:bg-muted/20"
                >
                  <td className="px-4 py-3 font-mono text-xs">{item.processCode}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{item.processName}</div>
                    <div className="text-xs text-muted-foreground">
                      {item.processLevel}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {item.parentCode ? (
                      <div>
                        <div className="font-mono text-xs">{item.parentCode}</div>
                        <div className="truncate">{item.parentName}</div>
                      </div>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="max-w-xs px-4 py-3">
                    <p className="line-clamp-2">{item.definition || "-"}</p>
                    {item.purpose && (
                      <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                        {item.purpose}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {item.bpmnModelId ? (
                      <div className="space-y-1">
                        <Link
                          href={`/bpmn/${item.bpmnModelId}`}
                          className="inline-flex items-center gap-1 text-primary hover:underline"
                        >
                          {item.bpmnModelName}
                          <ExternalLink className="size-3" />
                        </Link>
                        {item.bpmnElementName && (
                          <p className="text-xs text-muted-foreground">
                            {item.bpmnElementName}
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {item.frequency
                      ? t(`frequencyOptions.${item.frequency}`)
                      : "-"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={item.processStatus} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {item.updatedAt
                      ? new Intl.DateTimeFormat(undefined, {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                        }).format(new Date(item.updatedAt))
                      : "-"}
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setDetailNodeId(item.nodeId)}
                    >
                      <ClipboardList className="mr-1 size-4" />
                      {t("viewDetail")}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
    </div>
  );
};
