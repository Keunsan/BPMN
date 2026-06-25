/** Ontology Individual URI 빌더 */

import type { GraphNodeKind } from "@/types/operations-graph";
import type { OntologyClassName } from "@/types/ontology";

import { GRAPH_KIND_TO_CLASS, ONTOLOGY_NAMESPACE } from "@/lib/ontology/vocabulary";

const segmentByClass: Partial<Record<OntologyClassName, string>> = {
  Process: "process",
  VariantProcess: "process",
  Task: "task",
  E2EProcess: "e2e",
  ApplicationSystem: "system",
  DataTable: "table",
  SystemInterface: "interface",
  GlossaryTerm: "term",
};

/** 코드 기반 Individual URI 생성 */
export const buildProcessUri = (code: string): string =>
  `${ONTOLOGY_NAMESPACE}process/${encodeURIComponent(code)}`;

export const buildTaskUri = (code: string): string =>
  `${ONTOLOGY_NAMESPACE}task/${encodeURIComponent(code)}`;

export const buildSystemUri = (systemCode: string): string =>
  `${ONTOLOGY_NAMESPACE}system/${encodeURIComponent(systemCode)}`;

export const buildTableUri = (
  systemCode: string,
  schemaName: string | null,
  tableName: string,
): string => {
  const schema = schemaName ?? "dbo";
  return `${ONTOLOGY_NAMESPACE}table/${encodeURIComponent(systemCode)}/${encodeURIComponent(schema)}/${encodeURIComponent(tableName)}`;
};

export const buildGlossaryUri = (termId: string): string =>
  `${ONTOLOGY_NAMESPACE}term/${encodeURIComponent(termId)}`;

export const buildIndividualUri = (
  className: OntologyClassName,
  code: string,
): string => {
  const segment = segmentByClass[className] ?? "resource";
  return `${ONTOLOGY_NAMESPACE}${segment}/${encodeURIComponent(code)}`;
};

/** 그래프 노드의 ontology class */
export const getNodeOntologyClass = (
  kind: GraphNodeKind,
  meta?: Record<string, unknown>,
): OntologyClassName => {
  if (meta?.variantOf != null) {
    return "VariantProcess";
  }
  return GRAPH_KIND_TO_CLASS[kind] ?? "Process";
};

/** 그래프 노드 Individual URI */
export const getNodeOntologyUri = (
  kind: GraphNodeKind,
  code?: string,
  meta?: Record<string, unknown>,
): string | null => {
  if (!code) {
    return null;
  }
  return buildIndividualUri(getNodeOntologyClass(kind, meta), code);
};
