/** Domain Ontology v1 Class·ObjectProperty 상수 */

import type { GraphEdgeKind } from "@/types/operations-graph";

import type { ObjectPropertyName, OntologyClassName } from "@/types/ontology";

export const ONTOLOGY_NAMESPACE = "https://pams.local/ontology/";

export const GRAPH_KIND_TO_CLASS: Record<string, OntologyClassName> = {
  E2E: "E2EProcess",
  L3: "Process",
  TASK: "Task",
  APPLICATION: "ApplicationSystem",
  TABLE: "DataTable",
  INTERFACE: "SystemInterface",
};

export const GRAPH_EDGE_TO_PROPERTY: Record<GraphEdgeKind, ObjectPropertyName> = {
  CONTAINS: "contains",
  PRECEDES: "precedes",
  USES_SCREEN: "usesScreen",
  READS_TABLE: "readsTable",
  WRITES_TABLE: "writesTable",
  INTERFACE: "hasInterface",
};

export const INVERSE_PROPERTIES: Partial<
  Record<ObjectPropertyName, ObjectPropertyName>
> = {
  contains: "containedIn" as ObjectPropertyName,
  precedes: "precededBy",
  variantOf: "hasVariant",
  readsTable: "readByTask" as ObjectPropertyName,
  writesTable: "writtenByTask" as ObjectPropertyName,
  usesScreen: "usedByTask" as ObjectPropertyName,
  hasInterface: "interfaceOf" as ObjectPropertyName,
  broader: "narrower",
};
