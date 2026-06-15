import { ApiError } from "@/lib/api/error-handler";
import { withApiHandler } from "@/lib/api/route-handler";
import { buildOperationsGraph } from "@/lib/services/operations-graph.service";
import type {
  GraphEdgeKind,
  GraphNodeKind,
  OperationsGraphQuery,
} from "@/types/operations-graph";
import { GRAPH_NODE_KINDS } from "@/types/operations-graph";

const GRAPH_NODE_KIND_SET = new Set<string>(GRAPH_NODE_KINDS);

const parseKinds = (value: string | null): GraphNodeKind[] | undefined => {
  if (!value) {
    return undefined;
  }
  const kinds = value
    .split(",")
    .map((item) => item.trim())
    .filter((item): item is GraphNodeKind =>
      GRAPH_NODE_KIND_SET.has(item),
    );
  return kinds.length > 0 ? kinds : undefined;
};

const parseEdgeKinds = (value: string | null): GraphEdgeKind[] | undefined => {
  if (!value) {
    return undefined;
  }
  return value.split(",").map((item) => item.trim()) as GraphEdgeKind[];
};

/** GET /api/analysis/operations-graph — 운영 지식그래프 서브그래프 */
export const GET = withApiHandler(async ({ request }) => {
  const { searchParams } = new URL(request.url);
  const centerKind = searchParams.get("centerKind") as GraphNodeKind | null;
  const centerId = searchParams.get("centerId");
  const depth = Number(searchParams.get("depth") ?? "2");

  if (!centerKind || !GRAPH_NODE_KIND_SET.has(centerKind) || !centerId) {
    throw new ApiError("E001", "centerKind and centerId are required", 400);
  }

  const centerProcessLevel = searchParams.get("centerProcessLevel");
  const validCenterProcessLevels = new Set(["L1", "L2", "L3"]);

  const query: OperationsGraphQuery = {
    centerKind,
    centerId: /^\d+$/.test(centerId) ? Number(centerId) : centerId,
    centerProcessLevel:
      centerProcessLevel &&
      validCenterProcessLevels.has(centerProcessLevel)
        ? (centerProcessLevel as OperationsGraphQuery["centerProcessLevel"])
        : undefined,
    depth: depth === 1 ? 1 : 2,
    includeKinds: parseKinds(searchParams.get("includeKinds")),
    includeEdgeKinds: parseEdgeKinds(searchParams.get("includeEdgeKinds")),
    showInterfaces: searchParams.get("showInterfaces") !== "false",
    showTables: searchParams.get("showTables") !== "false",
    highlightCritical: searchParams.get("highlightCritical") === "true",
  };

  const data = await buildOperationsGraph(query);
  return { data };
});
