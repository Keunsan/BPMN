"use client";

import { GitBranch } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { EmptyState } from "@/components/common/EmptyState";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { SearchBar } from "@/components/common/SearchBar";
import { StatusBadge } from "@/components/common/StatusBadge";
import { ProcessTree } from "@/components/process/ProcessTree";
import { useDebounce } from "@/hooks/useDebounce";
import { useE2eProcessTree } from "@/lib/query/hooks/useE2eProcess";
import { cn } from "@/lib/utils";
import type { E2eProcessDto } from "@/types/e2e-process";
import type { ProcessFilters, ProcessLevel, ProcessNodeTree } from "@/types/process";

type TaskAttributeProcessTreeProps = {
  selectedProcessId?: number;
  selectedE2eId?: number;
  onSelectProcess: (node: ProcessNodeTree) => void;
  onSelectE2e?: (process: E2eProcessDto) => void;
  scopeFilters?: Pick<ProcessFilters, "companyCode" | "businessUnitCode">;
  /** picker에서 선택 가능한 레벨 (미지정 시 전체) */
  selectableLevels?: ProcessLevel[];
  /** false면 E2E는 표시만 하고 선택 불가 */
  e2eSelectable?: boolean;
  className?: string;
};

const matchesKeyword = (
  keyword: string,
  code: string,
  name: string,
): boolean => {
  const lower = keyword.toLowerCase();
  return (
    code.toLowerCase().includes(lower) || name.toLowerCase().includes(lower)
  );
};

/** E2E + L1~L4 통합 프로세스 트리 */
export const TaskAttributeProcessTree = ({
  selectedProcessId,
  selectedE2eId,
  onSelectProcess,
  onSelectE2e,
  scopeFilters,
  selectableLevels,
  e2eSelectable = true,
  className,
}: TaskAttributeProcessTreeProps) => {
  const tp = useTranslations("process");
  const te = useTranslations("e2eProcess");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  const { data: e2eItems, isLoading: e2eLoading, isError: e2eError } =
    useE2eProcessTree();

  const filteredE2eItems = useMemo(() => {
    const keyword = debouncedSearch.trim();
    if (!keyword) {
      return e2eItems ?? [];
    }
    return (e2eItems ?? []).filter((item) =>
      matchesKeyword(keyword, item.code, item.name),
    );
  }, [debouncedSearch, e2eItems]);

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder={tp("searchPlaceholder")}
        className="shrink-0"
      />

      <div className="shrink-0">
        <div className="mb-1.5 flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <GitBranch className="size-3.5 text-sky-600" />
          {te("sectionTitle")}
        </div>
        {e2eLoading ? (
          <LoadingSpinner className="py-3" />
        ) : e2eError ? (
          <EmptyState title={te("loadError")} className="py-3" />
        ) : !e2eItems?.length ? (
          <p className="px-2 text-xs text-muted-foreground">{te("empty")}</p>
        ) : !filteredE2eItems.length ? (
          <p className="px-2 text-xs text-muted-foreground">{te("emptySearch")}</p>
        ) : (
          <ul className="space-y-0.5">
            {filteredE2eItems.map((item) => (
              <li key={item.e2eProcessId}>
                <button
                  type="button"
                  disabled={!e2eSelectable}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm",
                    e2eSelectable
                      ? "hover:bg-muted/60"
                      : "cursor-default opacity-80",
                    e2eSelectable &&
                      selectedE2eId === item.e2eProcessId &&
                      "bg-accent font-medium text-accent-foreground",
                  )}
                  onClick={() => {
                    if (e2eSelectable) {
                      onSelectE2e?.(item);
                    }
                  }}
                >
                  <GitBranch className="size-3.5 shrink-0 text-sky-600" />
                  <span className="min-w-0 flex-1 truncate">
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {item.code}
                    </span>
                    <span className="ml-1.5">{item.name}</span>
                  </span>
                  <StatusBadge
                    status={item.status}
                    className="shrink-0 scale-90"
                  />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border-t pt-3">
        <ProcessTree
          variant="picker"
          selectedId={selectedProcessId}
          onSelect={onSelectProcess}
          scopeFilters={scopeFilters}
          selectableLevels={selectableLevels}
          search={search}
          showSearch={false}
        />
      </div>
    </div>
  );
};
