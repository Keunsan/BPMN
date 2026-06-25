/** 그래프·DB 데이터 → Ontology triple/context 투영 */

import { findGlossaryByCode, POC_GLOSSARY_TERMS } from "@/lib/ontology/glossary";
import { getCatalogByGraphEdge } from "@/lib/ontology/relationship-catalog";
import {
  buildIndividualUri,
  buildProcessUri,
  buildSystemUri,
  buildTableUri,
  buildTaskUri,
} from "@/lib/ontology/uri";
import { GRAPH_EDGE_TO_PROPERTY, GRAPH_KIND_TO_CLASS } from "@/lib/ontology/vocabulary";
import type {
  EdgeSemantics,
  GlossaryTermDto,
  ObjectPropertyName,
  OntologyContext,
  OntologyContextSummary,
  OntologyIndividual,
  OntologyTriple,
  SemanticEdge,
} from "@/types/ontology";
import type {
  GraphEdgeKind,
  OperationsGraphEdge,
  OperationsGraphNode,
} from "@/types/operations-graph";

export type ProjectionInput = {
  nodes: OperationsGraphNode[];
  edges: OperationsGraphEdge[];
};

const nodeToUri = (node: OperationsGraphNode): string => {
  const className = GRAPH_KIND_TO_CLASS[node.kind] ?? "Process";
  const code = node.code ?? String(node.sourceId);
  if (node.kind === "TASK") {
    return buildTaskUri(code);
  }
  if (node.kind === "APPLICATION") {
    return buildSystemUri(code);
  }
  if (node.kind === "TABLE") {
    const systemCode =
      typeof node.meta?.systemCode === "string" ? node.meta.systemCode : "SYS";
    const schemaName =
      typeof node.meta?.schemaName === "string" ? node.meta.schemaName : null;
    return buildTableUri(systemCode, schemaName, code);
  }
  return buildIndividualUri(className, code);
};

const nodeToIndividual = (node: OperationsGraphNode): OntologyIndividual => {
  const className = GRAPH_KIND_TO_CLASS[node.kind] ?? "Process";
  const variantOf =
    typeof node.meta?.variantOf === "number" ? node.meta.variantOf : null;

  return {
    uri: nodeToUri(node),
    className:
      variantOf !== null && node.kind === "L3"
        ? "VariantProcess"
        : className,
    label: node.label,
    code: node.code,
    graphNodeKind: node.kind,
    sourceId: node.sourceId,
    annotations: {
      status: node.status ?? null,
      isCritical: node.isCritical ?? false,
      ...(variantOf !== null ? { variantOf } : {}),
    },
  };
};

const edgeToSemantics = (edge: OperationsGraphEdge): EdgeSemantics => {
  const semantics = edge.semantics;
  const objectProperty = (semantics?.objectProperty ??
    GRAPH_EDGE_TO_PROPERTY[edge.kind]) as ObjectPropertyName;

  return {
    objectProperty,
    conditionDesc: semantics?.conditionDesc,
    isMandatory: semantics?.isMandatory,
    linkType: semantics?.linkType,
    crudType: semantics?.crudType,
    usageDescription: semantics?.usageDescription,
  };
};

const buildContextText = (
  individuals: OntologyIndividual[],
  triples: OntologyTriple[],
  glossaryTerms: GlossaryTermDto[],
): string => {
  const lines: string[] = [];

  lines.push("## Processes and Tasks");
  for (const item of individuals) {
    lines.push(
      `- [${item.className}] ${item.label} (${item.code ?? item.uri})`,
    );
  }

  lines.push("\n## Relationships");
  for (const triple of triples) {
    const annotations = triple.annotations ?? {};
    const extras = Object.entries(annotations)
      .filter(([, value]) => value !== null && value !== undefined && value !== "")
      .map(([key, value]) => `${key}=${String(value)}`)
      .join(", ");
    lines.push(
      `- ${triple.subject} --${triple.predicate}--> ${triple.object}${extras ? ` (${extras})` : ""}`,
    );
  }

  if (glossaryTerms.length > 0) {
    lines.push("\n## Glossary");
    for (const term of glossaryTerms) {
      lines.push(
        `- ${term.prefLabel}: ${term.definition} (codes: ${term.relatedCodes.join(", ")})`,
      );
    }
  }

  return lines.join("\n");
};

const collectGlossary = (nodes: OperationsGraphNode[]): GlossaryTermDto[] => {
  const seen = new Set<string>();
  const terms: GlossaryTermDto[] = [];

  for (const node of nodes) {
    if (!node.code) {
      continue;
    }
    for (const term of findGlossaryByCode(node.code)) {
      if (!seen.has(term.id)) {
        seen.add(term.id);
        terms.push(term);
      }
    }
  }

  return terms.length > 0 ? terms : POC_GLOSSARY_TERMS.slice(0, 8);
};

/** 그래프 결과를 Ontology context로 투영 */
export const projectOntologyContext = (
  input: ProjectionInput,
  l3Codes: string[] = [],
): OntologyContext => {
  const nodeById = new Map(input.nodes.map((node) => [node.id, node]));
  const individuals = input.nodes.map(nodeToIndividual);
  const triples: OntologyTriple[] = [];
  const semanticEdges: SemanticEdge[] = [];

  for (const edge of input.edges) {
    const source = nodeById.get(edge.source);
    const target = nodeById.get(edge.target);
    if (!source || !target) {
      continue;
    }

    const semantics = edgeToSemantics(edge);
    const catalog = getCatalogByGraphEdge(edge.kind);

    triples.push({
      subject: nodeToUri(source),
      predicate: semantics.objectProperty,
      object: nodeToUri(target),
      annotations: {
        graphEdgeKind: edge.kind,
        labelKo: catalog?.labelKo ?? edge.kind,
        condition_desc: semantics.conditionDesc ?? null,
        is_mandatory: semantics.isMandatory ?? null,
        link_type: semantics.linkType ?? null,
        crud_type: semantics.crudType ?? null,
        usage_description: semantics.usageDescription ?? null,
      },
    });

    semanticEdges.push({
      id: edge.id,
      sourceUri: nodeToUri(source),
      targetUri: nodeToUri(target),
      graphEdgeKind: edge.kind,
      semantics,
    });
  }

  const glossaryTerms = collectGlossary(input.nodes);
  const summary: OntologyContextSummary = {
    individualCount: individuals.length,
    tripleCount: triples.length,
    glossaryCount: glossaryTerms.length,
    l3Codes,
  };

  return {
    individuals,
    triples,
    edges: semanticEdges,
    glossaryTerms,
    summary,
    contextText: buildContextText(individuals, triples, glossaryTerms),
  };
};

/** Process 노드에 variantOf triple 추가 */
export const appendVariantTriple = (
  context: OntologyContext,
  variantCode: string,
  standardCode: string,
): OntologyContext => {
  const variantUri = buildProcessUri(variantCode);
  const standardUri = buildProcessUri(standardCode);

  return {
    ...context,
    triples: [
      ...context.triples,
      {
        subject: variantUri,
        predicate: "variantOf",
        object: standardUri,
        annotations: { scope: "WIQ/QT" },
      },
    ],
    contextText: `${context.contextText}\n- ${variantUri} --variantOf--> ${standardUri}`,
  };
};

export const graphEdgeKindToProperty = (
  kind: GraphEdgeKind,
): EdgeSemantics["objectProperty"] => GRAPH_EDGE_TO_PROPERTY[kind];
