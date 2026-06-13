import "server-only";

import type {
  GraphEdgeKind,
  GraphNodeKind,
  OperationsGraphEdge,
  OperationsGraphNode,
} from "@/types/operations-graph";
import {
  buildGraphNodeId,
  buildTableNodeId,
} from "@/types/operations-graph";

import { query, queryOne } from "../pool";

const MAX_NEIGHBOR_ROWS = 200;

type ProcessNeighborRow = {
  nodeId: number;
  code: string;
  name: string;
  level: string;
  status: string;
  parentNodeId: number | null;
};

type PredecessorRow = {
  nodeId: number;
  predecessorNodeId: number;
  predecessorCode: string;
  predecessorName: string;
  predecessorLevel: string;
};

type SystemMappingRow = {
  nodeId: number;
  systemId: number;
  systemCode: string;
  systemName: string;
};

type TableLinkRow = {
  nodeId: number;
  systemId: number;
  systemCode: string;
  systemName: string;
  schemaName: string | null;
  tableName: string;
  tableNameKor: string | null;
  crudType: string | null;
  isCritical: boolean;
};

type InterfaceRow = {
  interfaceId: number;
  interfaceCode: string;
  interfaceName: string;
  sourceSystemId: number;
  sourceSystemCode: string;
  sourceSystemName: string;
  targetSystemId: number;
  targetSystemCode: string;
  targetSystemName: string;
};

/** 프로세스 노드 단건 조회 */
export const findGraphProcessNode = async (
  nodeId: number,
): Promise<ProcessNeighborRow | null> => {
  const row = await queryOne<Record<string, unknown>>(
    `SELECT node_id AS nodeId, code, name, level, status, parent_node_id AS parentNodeId
     FROM process_node WHERE node_id = @nodeId`,
    { nodeId },
  );
  return row ? (row as unknown as ProcessNeighborRow) : null;
};

/** L3 하위 L4 Task 목록 */
export const listChildTasks = async (
  parentNodeId: number,
): Promise<ProcessNeighborRow[]> => {
  const rows = await query<Record<string, unknown>>(
    `SELECT TOP (@limit) node_id AS nodeId, code, name, level, status, parent_node_id AS parentNodeId
     FROM process_node
     WHERE parent_node_id = @parentNodeId AND level = 'L4'
     ORDER BY sort_order, code`,
    { parentNodeId, limit: MAX_NEIGHBOR_ROWS },
  );
  return rows as unknown as ProcessNeighborRow[];
};

/** Task 선후행 관계 */
export const listTaskPredecessors = async (
  nodeId: number,
): Promise<PredecessorRow[]> => {
  const rows = await query<Record<string, unknown>>(
    `SELECT TOP (@limit)
       tp.node_id AS nodeId,
       tp.predecessor_node_id AS predecessorNodeId,
       pn.code AS predecessorCode,
       pn.name AS predecessorName,
       pn.level AS predecessorLevel
     FROM task_predecessor tp
     INNER JOIN process_node pn ON pn.node_id = tp.predecessor_node_id
     WHERE tp.node_id = @nodeId
     ORDER BY tp.predecessor_id`,
    { nodeId, limit: MAX_NEIGHBOR_ROWS },
  );
  return rows as unknown as PredecessorRow[];
};

/** Task 시스템 매핑 (시스템 단위 집계) */
export const listTaskSystemMappings = async (
  nodeId: number,
): Promise<SystemMappingRow[]> => {
  const rows = await query<Record<string, unknown>>(
    `SELECT TOP (@limit)
       tsm.node_id AS nodeId,
       s.system_id AS systemId,
       s.system_code AS systemCode,
       s.system_name AS systemName
     FROM task_system_mapping tsm
     INNER JOIN system_screen sc ON sc.screen_id = tsm.screen_id
     INNER JOIN application_system s ON s.system_id = sc.system_id
     WHERE tsm.node_id = @nodeId
     GROUP BY tsm.node_id, s.system_id, s.system_code, s.system_name
     ORDER BY s.system_code`,
    { nodeId, limit: MAX_NEIGHBOR_ROWS },
  );
  return rows as unknown as SystemMappingRow[];
};

/** Task 데이터 테이블 연결 */
export const listTaskTableLinks = async (
  nodeId: number,
): Promise<TableLinkRow[]> => {
  const rows = await query<Record<string, unknown>>(
    `SELECT TOP (@limit)
       link.node_id AS nodeId,
       link.system_id AS systemId,
       s.system_code AS systemCode,
       s.system_name AS systemName,
       link.schema_name AS schemaName,
       link.table_name AS tableName,
       link.table_name_kor AS tableNameKor,
       link.crud_type AS crudType,
       link.is_critical AS isCritical
     FROM task_data_table_link link
     INNER JOIN application_system s ON s.system_id = link.system_id
     WHERE link.node_id = @nodeId
     ORDER BY s.system_code, link.table_name`,
    { nodeId, limit: MAX_NEIGHBOR_ROWS },
  );
  return rows as unknown as TableLinkRow[];
};

/** 테이블 기준 연결 Task 목록 */
export const listTasksByTable = async (
  systemId: number,
  schemaName: string | null,
  tableName: string,
): Promise<ProcessNeighborRow[]> => {
  const rows = await query<Record<string, unknown>>(
    `SELECT TOP (@limit)
       pn.node_id AS nodeId, pn.code, pn.name, pn.level, pn.status, pn.parent_node_id AS parentNodeId
     FROM task_data_table_link link
     INNER JOIN process_node pn ON pn.node_id = link.node_id
     WHERE link.system_id = @systemId
       AND link.table_name = @tableName
       AND ISNULL(link.schema_name, '') = ISNULL(@schemaName, '')
     ORDER BY pn.code`,
    {
      systemId,
      schemaName,
      tableName,
      limit: MAX_NEIGHBOR_ROWS,
    },
  );
  return rows as unknown as ProcessNeighborRow[];
};

/** 시스템 인터페이스 목록 */
export const listSystemInterfaces = async (
  systemId: number,
): Promise<InterfaceRow[]> => {
  const rows = await query<Record<string, unknown>>(
    `SELECT TOP (@limit)
       si.interface_id AS interfaceId,
       si.interface_code AS interfaceCode,
       si.interface_name AS interfaceName,
       si.source_system_id AS sourceSystemId,
       src.system_code AS sourceSystemCode,
       src.system_name AS sourceSystemName,
       si.target_system_id AS targetSystemId,
       tgt.system_code AS targetSystemCode,
       tgt.system_name AS targetSystemName
     FROM system_interface si
     INNER JOIN application_system src ON src.system_id = si.source_system_id
     INNER JOIN application_system tgt ON tgt.system_id = si.target_system_id
     WHERE si.source_system_id = @systemId OR si.target_system_id = @systemId
     ORDER BY si.interface_code`,
    { systemId, limit: MAX_NEIGHBOR_ROWS },
  );
  return rows as unknown as InterfaceRow[];
};

const toProcessNode = (row: ProcessNeighborRow): OperationsGraphNode => ({
  id: buildGraphNodeId(row.level === "L3" ? "L3" : "TASK", row.nodeId),
  kind: row.level === "L3" ? "L3" : "TASK",
  label: row.name,
  code: row.code,
  status: row.status,
  sourceId: row.nodeId,
});

const toApplicationNode = (row: SystemMappingRow): OperationsGraphNode => ({
  id: buildGraphNodeId("APPLICATION", row.systemId),
  kind: "APPLICATION",
  label: row.systemName,
  code: row.systemCode,
  sourceId: row.systemId,
});

const toTableNode = (row: TableLinkRow): OperationsGraphNode => ({
  id: buildTableNodeId(row.systemId, row.schemaName, row.tableName),
  kind: "TABLE",
  label: row.tableNameKor ?? row.tableName,
  code: row.tableName,
  sourceId: `${row.systemId}:${row.schemaName ?? ""}:${row.tableName}`,
  isCritical: row.isCritical,
  meta: {
    systemCode: row.systemCode,
    schemaName: row.schemaName,
    crudType: row.crudType,
  },
});

const toInterfaceNode = (row: InterfaceRow): OperationsGraphNode => ({
  id: buildGraphNodeId("INTERFACE", row.interfaceId),
  kind: "INTERFACE",
  label: row.interfaceName,
  code: row.interfaceCode,
  sourceId: row.interfaceId,
  meta: {
    sourceSystemCode: row.sourceSystemCode,
    targetSystemCode: row.targetSystemCode,
  },
});

export type GraphNeighborBundle = {
  nodes: OperationsGraphNode[];
  edges: OperationsGraphEdge[];
};

/** 단일 프로세스 노드의 이웃 노드·엣지를 수집한다 */
export const collectProcessNeighbors = async (
  nodeId: number,
  level: string,
  options: {
    showInterfaces: boolean;
    showTables: boolean;
  },
): Promise<GraphNeighborBundle> => {
  const nodes: OperationsGraphNode[] = [];
  const edges: OperationsGraphEdge[] = [];
  const nodeIds = new Set<string>();

  const addNode = (node: OperationsGraphNode) => {
    if (!nodeIds.has(node.id)) {
      nodeIds.add(node.id);
      nodes.push(node);
    }
  };

  const addEdge = (
    source: string,
    target: string,
    kind: GraphEdgeKind,
    label?: string,
  ) => {
    const id = `${kind}:${source}->${target}`;
    if (!edges.some((edge) => edge.id === id)) {
      edges.push({ id, source, target, kind, label });
    }
  };

  const centerId =
    level === "L3"
      ? buildGraphNodeId("L3", nodeId)
      : buildGraphNodeId("TASK", nodeId);

  if (level === "L3") {
    const children = await listChildTasks(nodeId);
    for (const child of children) {
      const childNode = toProcessNode(child);
      addNode(childNode);
      addEdge(centerId, childNode.id, "CONTAINS");
    }
  }

  const predecessors = await listTaskPredecessors(nodeId);
  for (const pred of predecessors) {
    const predNode: OperationsGraphNode = {
      id: buildGraphNodeId(
        pred.predecessorLevel === "L3" ? "L3" : "TASK",
        pred.predecessorNodeId,
      ),
      kind: pred.predecessorLevel === "L3" ? "L3" : "TASK",
      label: pred.predecessorName,
      code: pred.predecessorCode,
      sourceId: pred.predecessorNodeId,
    };
    addNode(predNode);
    addEdge(predNode.id, centerId, "PRECEDES");
  }

  const systems = await listTaskSystemMappings(nodeId);
  for (const sys of systems) {
    const appNode = toApplicationNode(sys);
    addNode(appNode);
    addEdge(centerId, appNode.id, "USES_SCREEN");

    if (options.showInterfaces) {
      const interfaces = await listSystemInterfaces(sys.systemId);
      for (const iface of interfaces) {
        const ifaceNode = toInterfaceNode(iface);
        addNode(ifaceNode);
        addEdge(
          buildGraphNodeId("APPLICATION", iface.sourceSystemId),
          ifaceNode.id,
          "INTERFACE",
        );
        addEdge(
          ifaceNode.id,
          buildGraphNodeId("APPLICATION", iface.targetSystemId),
          "INTERFACE",
        );

        const srcApp: OperationsGraphNode = {
          id: buildGraphNodeId("APPLICATION", iface.sourceSystemId),
          kind: "APPLICATION",
          label: iface.sourceSystemName,
          code: iface.sourceSystemCode,
          sourceId: iface.sourceSystemId,
        };
        const tgtApp: OperationsGraphNode = {
          id: buildGraphNodeId("APPLICATION", iface.targetSystemId),
          kind: "APPLICATION",
          label: iface.targetSystemName,
          code: iface.targetSystemCode,
          sourceId: iface.targetSystemId,
        };
        addNode(srcApp);
        addNode(tgtApp);
      }
    }
  }

  if (options.showTables) {
    const tables = await listTaskTableLinks(nodeId);
    for (const table of tables) {
      const tableNode = toTableNode(table);
      addNode(tableNode);
      const edgeKind: GraphEdgeKind =
        table.crudType === "R" || table.crudType === "RU"
          ? "READS_TABLE"
          : "WRITES_TABLE";
      addEdge(centerId, tableNode.id, edgeKind, table.crudType ?? undefined);
    }
  }

  return { nodes, edges };
};

/** APPLICATION 중심 이웃 수집 */
export const collectApplicationNeighbors = async (
  systemId: number,
  options: { showInterfaces: boolean },
): Promise<GraphNeighborBundle> => {
  const nodes: OperationsGraphNode[] = [];
  const edges: OperationsGraphEdge[] = [];
  const centerId = buildGraphNodeId("APPLICATION", systemId);

  const systemRow = await queryOne<Record<string, unknown>>(
    `SELECT system_id AS systemId, system_code AS systemCode, system_name AS systemName
     FROM application_system WHERE system_id = @systemId`,
    { systemId },
  );

  if (!systemRow) {
    return { nodes, edges };
  }

  nodes.push({
    id: centerId,
    kind: "APPLICATION",
    label: systemRow.systemName as string,
    code: systemRow.systemCode as string,
    sourceId: systemId,
  });

  const taskRows = await query<Record<string, unknown>>(
    `SELECT TOP (@limit)
       pn.node_id AS nodeId, pn.code, pn.name, pn.level, pn.status
     FROM task_system_mapping tsm
     INNER JOIN system_screen sc ON sc.screen_id = tsm.screen_id
     INNER JOIN process_node pn ON pn.node_id = tsm.node_id
     WHERE sc.system_id = @systemId
     GROUP BY pn.node_id, pn.code, pn.name, pn.level, pn.status
     ORDER BY pn.code`,
    { systemId, limit: MAX_NEIGHBOR_ROWS },
  );

  for (const row of taskRows) {
    const taskNode = toProcessNode(row as unknown as ProcessNeighborRow);
    nodes.push(taskNode);
    edges.push({
      id: `USES_SCREEN:${taskNode.id}->${centerId}`,
      source: taskNode.id,
      target: centerId,
      kind: "USES_SCREEN",
    });
  }

  if (options.showInterfaces) {
    const interfaces = await listSystemInterfaces(systemId);
    for (const iface of interfaces) {
      const ifaceNode = toInterfaceNode(iface);
      nodes.push(ifaceNode);
      const srcId = buildGraphNodeId("APPLICATION", iface.sourceSystemId);
      const tgtId = buildGraphNodeId("APPLICATION", iface.targetSystemId);
      edges.push({
        id: `INTERFACE:${srcId}->${ifaceNode.id}`,
        source: srcId,
        target: ifaceNode.id,
        kind: "INTERFACE",
      });
      edges.push({
        id: `INTERFACE:${ifaceNode.id}->${tgtId}`,
        source: ifaceNode.id,
        target: tgtId,
        kind: "INTERFACE",
      });
    }
  }

  return { nodes, edges };
};

/** TABLE 중심 이웃 수집 */
export const collectTableNeighbors = async (
  systemId: number,
  schemaName: string | null,
  tableName: string,
): Promise<GraphNeighborBundle> => {
  const nodes: OperationsGraphNode[] = [];
  const edges: OperationsGraphEdge[] = [];
  const centerId = buildTableNodeId(systemId, schemaName, tableName);

  const systemRow = await queryOne<Record<string, unknown>>(
    `SELECT system_code AS systemCode, system_name AS systemName
     FROM application_system WHERE system_id = @systemId`,
    { systemId },
  );

  nodes.push({
    id: centerId,
    kind: "TABLE",
    label: tableName,
    code: tableName,
    sourceId: `${systemId}:${schemaName ?? ""}:${tableName}`,
    meta: systemRow
      ? {
          systemCode: systemRow.systemCode,
          schemaName,
        }
      : { schemaName },
  });

  const tasks = await listTasksByTable(systemId, schemaName, tableName);
  for (const task of tasks) {
    const taskNode = toProcessNode(task);
    nodes.push(taskNode);
    edges.push({
      id: `READS_TABLE:${taskNode.id}->${centerId}`,
      source: taskNode.id,
      target: centerId,
      kind: "READS_TABLE",
    });
  }

  if (systemRow) {
    const appNode: OperationsGraphNode = {
      id: buildGraphNodeId("APPLICATION", systemId),
      kind: "APPLICATION",
      label: systemRow.systemName as string,
      code: systemRow.systemCode as string,
      sourceId: systemId,
    };
    nodes.push(appNode);
    edges.push({
      id: `USES_SCREEN:${centerId}->${appNode.id}`,
      source: centerId,
      target: appNode.id,
      kind: "USES_SCREEN",
    });
  }

  return { nodes, edges };
};

export type { GraphNodeKind };
