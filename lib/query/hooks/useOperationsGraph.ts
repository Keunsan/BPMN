"use client";

import { useQuery } from "@tanstack/react-query";

import { apiGet } from "@/lib/api/client";
import { analysisKeys } from "@/lib/query/keys";
import type {
  GraphNodeKind,
  OperationsGraphQuery,
  OperationsGraphResult,
} from "@/types/operations-graph";

const fetchOperationsGraph = async (
  params: OperationsGraphQuery,
): Promise<OperationsGraphResult> => {
  return apiGet<OperationsGraphResult>(
    "/api/analysis/operations-graph",
    {
      params: {
        centerKind: params.centerKind,
        centerId: params.centerId,
        depth: params.depth,
        showInterfaces: params.showInterfaces,
        showTables: params.showTables,
        highlightCritical: params.highlightCritical,
        includeKinds: params.includeKinds?.join(","),
        includeEdgeKinds: params.includeEdgeKinds?.join(","),
      },
    },
  );
};

/** 운영 지식그래프 서브그래프 조회 훅 */
export const useOperationsGraph = (
  params: OperationsGraphQuery | null,
  enabled = true,
) =>
  useQuery({
    queryKey: analysisKeys.operationsGraph(
      (params ?? {}) as Record<string, unknown>,
    ),
    queryFn: () => fetchOperationsGraph(params!),
    enabled: enabled && params !== null && Boolean(params.centerId),
    staleTime: 30_000,
  });

export type { GraphNodeKind };
