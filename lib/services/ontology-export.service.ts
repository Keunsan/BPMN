import "server-only";

import { ApiError } from "@/lib/api/error-handler";
import {
  appendVariantTriple,
  projectOntologyContext,
} from "@/lib/ontology/projections";
import { buildOperationsGraph } from "@/lib/services/operations-graph.service";
import type { OntologyContext } from "@/types/ontology";
import {
  POC_ONTOLOGY_L3_CODES,
  POC_ONTOLOGY_L3_IDS,
} from "@/types/ontology";
import type {
  OperationsGraphEdge,
  OperationsGraphNode,
  OperationsGraphQuery,
} from "@/types/operations-graph";

export type OntologyExportScope = {
  centerNodeId?: number;
  depth?: 1 | 2;
  includePocBundle?: boolean;
};

const POC_GRAPH_QUERY = (
  centerNodeId: number,
  depth: 1 | 2,
): OperationsGraphQuery => ({
  centerKind: "L3",
  centerId: centerNodeId,
  centerProcessLevel: "L3",
  depth,
  showInterfaces: true,
  showTables: true,
});

const mergeGraphs = (
  bundles: Array<{ nodes: OperationsGraphNode[]; edges: OperationsGraphEdge[] }>,
): { nodes: OperationsGraphNode[]; edges: OperationsGraphEdge[] } => {
  const nodeMap = new Map<string, OperationsGraphNode>();
  const edgeMap = new Map<string, OperationsGraphEdge>();

  for (const bundle of bundles) {
    for (const node of bundle.nodes) {
      if (!nodeMap.has(node.id)) {
        nodeMap.set(node.id, node);
      }
    }
    for (const edge of bundle.edges) {
      if (!edgeMap.has(edge.id)) {
        edgeMap.set(edge.id, edge);
      }
    }
  }

  return {
    nodes: Array.from(nodeMap.values()),
    edges: Array.from(edgeMap.values()),
  };
};

/** 단일 L3 중심 ontology context 생성 */
export const buildOntologyContextForL3 = async (
  centerNodeId: number,
  depth: 1 | 2 = 2,
): Promise<OntologyContext> => {
  const graph = await buildOperationsGraph(POC_GRAPH_QUERY(centerNodeId, depth));
  const l3Node = graph.nodes.find(
    (node) => node.kind === "L3" && Number(node.sourceId) === centerNodeId,
  );
  const l3Codes = l3Node?.code ? [l3Node.code] : [];

  let context = projectOntologyContext(
    { nodes: graph.nodes, edges: graph.edges },
    l3Codes,
  );

  if (centerNodeId === 215) {
    context = appendVariantTriple(
      context,
      "STP-01-01-01-V-WIQ-QT",
      "STP-01-01-01",
    );
  }

  return context;
};

/** POC 3 L3 통합 ontology context — AI RAG용 */
export const buildPocOntologyContext = async (
  depth: 1 | 2 = 2,
): Promise<OntologyContext> => {
  const bundles = await Promise.all(
    POC_ONTOLOGY_L3_IDS.map(async (l3Id) =>
      buildOperationsGraph(POC_GRAPH_QUERY(l3Id, depth)),
    ),
  );

  const merged = mergeGraphs(bundles);

  let context = projectOntologyContext(merged, [...POC_ONTOLOGY_L3_CODES]);

  context = appendVariantTriple(
    context,
    "STP-01-01-01-V-WIQ-QT",
    "STP-01-01-01",
  );

  return context;
};

/** ontology export 진입점 */
export const buildOntologyContext = async (
  scope: OntologyExportScope = {},
): Promise<OntologyContext> => {
  const depth = scope.depth ?? 2;

  if (scope.includePocBundle || !scope.centerNodeId) {
    return buildPocOntologyContext(depth);
  }

  const isPocL3 = (POC_ONTOLOGY_L3_IDS as readonly number[]).includes(
    scope.centerNodeId,
  );
  if (!isPocL3) {
    throw new ApiError(
      "E001",
      "POC scope supports centerNodeId 215, 241, 253 only",
      400,
      undefined,
      "centerNodeId",
    );
  }

  return buildOntologyContextForL3(scope.centerNodeId, depth);
};
