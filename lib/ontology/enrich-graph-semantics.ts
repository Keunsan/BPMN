import "server-only";

import { GRAPH_EDGE_TO_PROPERTY } from "@/lib/ontology/vocabulary";
import { query } from "@/lib/db/pool";
import type {
  GraphEdgeKind,
  GraphEdgeSemantics,
  OperationsGraphEdge,
  OperationsGraphNode,
} from "@/types/operations-graph";
import { buildGraphNodeId } from "@/types/operations-graph";

type PredecessorSemanticsRow = {
  nodeId: number;
  predecessorNodeId: number;
  conditionDesc: string | null;
  isMandatory: boolean;
};

type TableSemanticsRow = {
  nodeId: number;
  systemId: number;
  tableName: string;
  schemaName: string | null;
  linkType: string;
  crudType: string | null;
};

type SystemSemanticsRow = {
  nodeId: number;
  systemId: number;
  usageDescription: string | null;
};

const parseTaskNodeId = (graphNodeId: string): number | null => {
  if (!graphNodeId.startsWith("TASK:")) {
    return null;
  }
  const id = Number(graphNodeId.slice("TASK:".length));
  return Number.isFinite(id) ? id : null;
};

const parseAppNodeTaskScope = (
  graphNodeId: string,
): { taskId: number; systemId: number } | null => {
  if (!graphNodeId.startsWith("APPLICATION:T")) {
    return null;
  }
  const rest = graphNodeId.slice("APPLICATION:".length);
  const parts = rest.split(":");
  if (parts.length < 2) {
    return null;
  }
  const taskId = Number(parts[0]!.slice(1));
  const systemId = Number(parts[1]);
  if (!Number.isFinite(taskId) || !Number.isFinite(systemId)) {
    return null;
  }
  return { taskId, systemId };
};

const listPredecessorSemantics = async (
  taskIds: number[],
): Promise<PredecessorSemanticsRow[]> => {
  if (taskIds.length === 0) {
    return [];
  }
  const placeholders = taskIds.map((_, i) => `@id${i}`).join(", ");
  const params: Record<string, number> = {};
  taskIds.forEach((id, i) => {
    params[`id${i}`] = id;
  });

  const rows = await query<Record<string, unknown>>(
    `SELECT node_id AS nodeId, predecessor_node_id AS predecessorNodeId,
            condition_desc AS conditionDesc, is_mandatory AS isMandatory
     FROM task_predecessor
     WHERE node_id IN (${placeholders})`,
    params,
  );
  return rows as unknown as PredecessorSemanticsRow[];
};

const listTableSemantics = async (
  taskIds: number[],
): Promise<TableSemanticsRow[]> => {
  if (taskIds.length === 0) {
    return [];
  }
  const placeholders = taskIds.map((_, i) => `@id${i}`).join(", ");
  const params: Record<string, number> = {};
  taskIds.forEach((id, i) => {
    params[`id${i}`] = id;
  });

  const rows = await query<Record<string, unknown>>(
    `SELECT node_id AS nodeId, system_id AS systemId, schema_name AS schemaName,
            table_name AS tableName, link_type AS linkType, crud_type AS crudType
     FROM task_data_table_link
     WHERE node_id IN (${placeholders})`,
    params,
  );
  return rows as unknown as TableSemanticsRow[];
};

const listSystemSemantics = async (
  taskIds: number[],
): Promise<SystemSemanticsRow[]> => {
  if (taskIds.length === 0) {
    return [];
  }
  const placeholders = taskIds.map((_, i) => `@id${i}`).join(", ");
  const params: Record<string, number> = {};
  taskIds.forEach((id, i) => {
    params[`id${i}`] = id;
  });

  const rows = await query<Record<string, unknown>>(
    `SELECT node_id AS nodeId, system_id AS systemId, usage_description AS usageDescription
     FROM task_system_link
     WHERE node_id IN (${placeholders})`,
    params,
  );
  return rows as unknown as SystemSemanticsRow[];
};

const defaultSemantics = (kind: GraphEdgeKind): GraphEdgeSemantics => ({
  objectProperty: GRAPH_EDGE_TO_PROPERTY[kind],
});

/** 그래프 엣지에 DB 기반 온톨로지 semantics 주석을 병합한다 */
export const enrichGraphEdgesWithSemantics = async (
  nodes: OperationsGraphNode[],
  edges: OperationsGraphEdge[],
): Promise<OperationsGraphEdge[]> => {
  const taskIds = nodes
    .filter((node) => node.kind === "TASK")
    .map((node) => Number(node.sourceId))
    .filter((id) => Number.isFinite(id));

  if (taskIds.length === 0) {
    return edges.map((edge) => ({
      ...edge,
      semantics: edge.semantics ?? defaultSemantics(edge.kind),
    }));
  }

  const [predecessors, tables, systems] = await Promise.all([
    listPredecessorSemantics(taskIds),
    listTableSemantics(taskIds),
    listSystemSemantics(taskIds),
  ]);

  const predKey = (nodeId: number, predId: number) => `${nodeId}:${predId}`;
  const predMap = new Map(
    predecessors.map((row) => [
      predKey(row.nodeId, row.predecessorNodeId),
      row,
    ]),
  );

  const tableKey = (
    nodeId: number,
    systemId: number,
    schema: string | null,
    table: string,
  ) => `${nodeId}:${systemId}:${schema ?? ""}:${table}`;

  const tableMap = new Map(
    tables.map((row) => [
      tableKey(row.nodeId, row.systemId, row.schemaName, row.tableName),
      row,
    ]),
  );

  const systemKey = (nodeId: number, systemId: number) => `${nodeId}:${systemId}`;
  const systemMap = new Map(
    systems.map((row) => [systemKey(row.nodeId, row.systemId), row]),
  );

  const nodeById = new Map(nodes.map((node) => [node.id, node]));

  return edges.map((edge) => {
    const kind = edge.kind;
    const base = edge.semantics ?? defaultSemantics(kind);

    if (kind === "PRECEDES") {
      const targetTaskId = parseTaskNodeId(edge.target);
      const sourceTaskId = parseTaskNodeId(edge.source);
      const sourceL3 = edge.source.startsWith("L3:");
      const targetL3 = edge.target.startsWith("L3:");

      if (targetTaskId !== null && sourceTaskId !== null) {
        const row = predMap.get(predKey(targetTaskId, sourceTaskId));
        if (row) {
          return {
            ...edge,
            semantics: {
              ...base,
              objectProperty: "precedes",
              conditionDesc: row.conditionDesc,
              isMandatory: row.isMandatory,
            },
          };
        }
      }

      if (targetTaskId !== null && sourceL3) {
        const sourceNode = nodeById.get(edge.source);
        const predId = sourceNode ? Number(sourceNode.sourceId) : null;
        if (predId !== null && Number.isFinite(predId)) {
          const row = predMap.get(predKey(targetTaskId, predId));
          if (row) {
            return {
              ...edge,
              semantics: {
                ...base,
                objectProperty: "precedes",
                conditionDesc: row.conditionDesc,
                isMandatory: row.isMandatory,
              },
            };
          }
        }
      }

      if (sourceTaskId !== null && targetL3) {
        const targetNode = nodeById.get(edge.target);
        const predId = targetNode ? Number(targetNode.sourceId) : null;
        if (predId !== null && Number.isFinite(predId)) {
          const row = predMap.get(predKey(predId, sourceTaskId));
          if (row) {
            return {
              ...edge,
              semantics: {
                ...base,
                objectProperty: "precedes",
                conditionDesc: row.conditionDesc,
                isMandatory: row.isMandatory,
              },
            };
          }
        }
      }
    }

    if (kind === "READS_TABLE" || kind === "WRITES_TABLE") {
      const tableNode = nodeById.get(edge.target);
      if (tableNode?.kind === "TABLE") {
        const scope = parseAppNodeTaskScope(edge.source);
        const taskId = scope?.taskId;
        const systemId =
          scope?.systemId ??
          (tableNode.meta?.systemId
            ? Number(tableNode.meta.systemId)
            : null);

        if (taskId && systemId) {
          const schema =
            typeof tableNode.meta?.schemaName === "string"
              ? tableNode.meta.schemaName
              : null;
          const tableName = tableNode.code ?? String(tableNode.sourceId);
          const row = tableMap.get(
            tableKey(taskId, systemId, schema, tableName.split(":").pop() ?? tableName),
          );
          if (row) {
            return {
              ...edge,
              semantics: {
                ...base,
                objectProperty: GRAPH_EDGE_TO_PROPERTY[kind],
                linkType: row.linkType as GraphEdgeSemantics["linkType"],
                crudType: row.crudType,
              },
            };
          }
        }
      }
    }

    if (kind === "USES_SCREEN") {
      const taskId = parseTaskNodeId(edge.source);
      const scope = parseAppNodeTaskScope(edge.target);
      const systemId = scope?.systemId;
      if (taskId && systemId) {
        const row = systemMap.get(systemKey(taskId, systemId));
        if (row) {
          return {
            ...edge,
            semantics: {
              ...base,
              objectProperty: "usesScreen",
              usageDescription: row.usageDescription,
            },
          };
        }
      }
    }

    if (kind === "CONTAINS") {
      return {
        ...edge,
        semantics: { ...base, objectProperty: "contains" },
      };
    }

    return { ...edge, semantics: base };
  });
};

/** L3 변형 노드에 variantOf 메타를 추가한다 */
export const enrichNodesWithVariantMeta = async (
  nodes: OperationsGraphNode[],
): Promise<OperationsGraphNode[]> => {
  const l3Nodes = nodes.filter((node) => node.kind === "L3" && node.code);
  if (l3Nodes.length === 0) {
    return nodes;
  }

  const codes = l3Nodes.map((node) => node.code!);
  const placeholders = codes.map((_, i) => `@code${i}`).join(", ");
  const params: Record<string, string> = {};
  codes.forEach((code, i) => {
    params[`code${i}`] = code;
  });

  const rows = await query<Record<string, unknown>>(
    `SELECT node_id AS nodeId, code, variant_of AS variantOf
     FROM process_node
     WHERE code IN (${placeholders}) AND variant_of IS NOT NULL`,
    params,
  );

  const variantMap = new Map(
    (rows as Array<{ nodeId: number; code: string; variantOf: number }>).map(
      (row) => [buildGraphNodeId("L3", row.nodeId), row.variantOf],
    ),
  );

  return nodes.map((node) => {
    const variantOf = variantMap.get(node.id);
    if (variantOf === undefined) {
      return node;
    }
    return {
      ...node,
      meta: { ...node.meta, variantOf },
    };
  });
};
