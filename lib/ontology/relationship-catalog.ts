/** SSOT 테이블 ↔ ObjectProperty 관계 카탈로그 */

import type { GraphEdgeKind } from "@/types/operations-graph";

import type { ObjectPropertyName, OntologyClassName } from "@/types/ontology";

export type RelationshipCatalogEntry = {
  property: ObjectPropertyName;
  graphEdgeKind?: GraphEdgeKind;
  labelKo: string;
  domain: OntologyClassName | OntologyClassName[];
  range: OntologyClassName | OntologyClassName[];
  inverseOf?: ObjectPropertyName;
  ssot?: {
    table: string;
    sourceColumn: string;
    targetColumn: string;
  };
  dataProperties?: string[];
};

/** POC 3 L3에서 사용하는 ObjectProperty 정의 */
export const RELATIONSHIP_CATALOG: RelationshipCatalogEntry[] = [
  {
    property: "contains",
    graphEdgeKind: "CONTAINS",
    labelKo: "포함",
    domain: ["Process", "E2EProcess"],
    range: ["Process", "Task"],
    inverseOf: "containedIn" as ObjectPropertyName,
    ssot: {
      table: "process_node",
      sourceColumn: "parent_node_id",
      targetColumn: "node_id",
    },
  },
  {
    property: "precedes",
    graphEdgeKind: "PRECEDES",
    labelKo: "선행",
    domain: "Task",
    range: "Task",
    inverseOf: "precededBy",
    ssot: {
      table: "task_predecessor",
      sourceColumn: "predecessor_node_id",
      targetColumn: "node_id",
    },
    dataProperties: ["condition_desc", "is_mandatory"],
  },
  {
    property: "variantOf",
    labelKo: "변형",
    domain: "VariantProcess",
    range: "Process",
    inverseOf: "hasVariant",
    ssot: {
      table: "process_node",
      sourceColumn: "variant_of",
      targetColumn: "node_id",
    },
  },
  {
    property: "usesScreen",
    graphEdgeKind: "USES_SCREEN",
    labelKo: "시스템 사용",
    domain: "Task",
    range: "ApplicationSystem",
    inverseOf: "usedByTask" as ObjectPropertyName,
    ssot: {
      table: "task_system_link",
      sourceColumn: "node_id",
      targetColumn: "system_id",
    },
    dataProperties: ["usage_description"],
  },
  {
    property: "readsTable",
    graphEdgeKind: "READS_TABLE",
    labelKo: "테이블 읽기",
    domain: "Task",
    range: "DataTable",
    inverseOf: "readByTask" as ObjectPropertyName,
    ssot: {
      table: "task_data_table_link",
      sourceColumn: "node_id",
      targetColumn: "table_name",
    },
    dataProperties: ["link_type", "crud_type"],
  },
  {
    property: "writesTable",
    graphEdgeKind: "WRITES_TABLE",
    labelKo: "테이블 쓰기",
    domain: "Task",
    range: "DataTable",
    inverseOf: "writtenByTask" as ObjectPropertyName,
    ssot: {
      table: "task_data_table_link",
      sourceColumn: "node_id",
      targetColumn: "table_name",
    },
    dataProperties: ["link_type", "crud_type"],
  },
];

export const getCatalogByProperty = (
  property: ObjectPropertyName,
): RelationshipCatalogEntry | undefined =>
  RELATIONSHIP_CATALOG.find((entry) => entry.property === property);

export const getCatalogByGraphEdge = (
  kind: GraphEdgeKind,
): RelationshipCatalogEntry | undefined =>
  RELATIONSHIP_CATALOG.find((entry) => entry.graphEdgeKind === kind);
