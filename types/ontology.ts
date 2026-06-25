/** Domain Ontology v1 DTO — POC */

import type { GraphEdgeKind, GraphNodeKind } from "@/types/operations-graph";

export type OntologyClassName =
  | "Process"
  | "Task"
  | "E2EProcess"
  | "VariantProcess"
  | "ApplicationSystem"
  | "DataTable"
  | "SystemInterface"
  | "GlossaryTerm";

export type ObjectPropertyName =
  | "contains"
  | "precededBy"
  | "precedes"
  | "variantOf"
  | "hasVariant"
  | "usesScreen"
  | "readsTable"
  | "writesTable"
  | "hasInterface"
  | "broader"
  | "narrower"
  | "exactMatch";

export type OntologyIndividual = {
  uri: string;
  className: OntologyClassName;
  label: string;
  code?: string;
  graphNodeKind?: GraphNodeKind;
  sourceId?: number | string;
  annotations?: Record<string, string | number | boolean | null>;
};

export type EdgeSemantics = {
  objectProperty: ObjectPropertyName;
  conditionDesc?: string | null;
  isMandatory?: boolean;
  linkType?: "INPUT" | "OUTPUT" | "REFERENCE";
  crudType?: string | null;
  usageDescription?: string | null;
};

export type SemanticEdge = {
  id: string;
  sourceUri: string;
  targetUri: string;
  graphEdgeKind: GraphEdgeKind;
  semantics: EdgeSemantics;
};

export type OntologyTriple = {
  subject: string;
  predicate: ObjectPropertyName;
  object: string;
  annotations?: Record<string, string | number | boolean | null>;
};

export type GlossaryTermDto = {
  id: string;
  prefLabel: string;
  altLabels: string[];
  definition: string;
  relatedCodes: string[];
};

export type OntologyContextSummary = {
  individualCount: number;
  tripleCount: number;
  glossaryCount: number;
  l3Codes: string[];
};

export type OntologyContext = {
  individuals: OntologyIndividual[];
  triples: OntologyTriple[];
  edges: SemanticEdge[];
  glossaryTerms: GlossaryTermDto[];
  summary: OntologyContextSummary;
  contextText: string;
};

export type OntologyCitation = {
  code: string;
  name: string;
  kind: GraphNodeKind | "Process" | "Task";
  uri: string;
};

export type OntologyQaResult = {
  answer: string;
  citations: OntologyCitation[];
};

export const POC_ONTOLOGY_L3_IDS = [215, 241, 253] as const;

export const POC_ONTOLOGY_L3_CODES = [
  "STP-01-01-01-V-WIQ-QT",
  "STP-01-01-02",
  "STP-01-01-03",
] as const;
