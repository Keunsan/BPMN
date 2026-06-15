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

/** Task 시스템 1차 연결 (시스템 단위) */
export const listTaskSystemMappings = async (
  nodeId: number,
): Promise<SystemMappingRow[]> => {
  const rows = await query<Record<string, unknown>>(
    `SELECT TOP (@limit)
       tsl.node_id AS nodeId,
       s.system_id AS systemId,
       s.system_code AS systemCode,
       s.system_name AS systemName
     FROM task_system_link tsl
     INNER JOIN application_system s ON s.system_id = tsl.system_id
     WHERE tsl.node_id = @nodeId
     ORDER BY tsl.is_primary DESC, s.system_code`,
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

/** L1/L2 하위 L3 프로세스 목록 */
export const listDescendantL3Processes = async (
  rootNodeId: number,
): Promise<ProcessNeighborRow[]> => {
  const rows = await query<Record<string, unknown>>(
    `WITH descendants AS (
       SELECT node_id, code, name, level, status, parent_node_id
       FROM process_node
       WHERE node_id = @rootNodeId
       UNION ALL
       SELECT pn.node_id, pn.code, pn.name, pn.level, pn.status, pn.parent_node_id
       FROM process_node pn
       INNER JOIN descendants d ON pn.parent_node_id = d.node_id
     )
     SELECT TOP (@limit)
       node_id AS nodeId, code, name, level, status, parent_node_id AS parentNodeId
     FROM descendants
     WHERE level = 'L3'
     ORDER BY code`,
    { rootNodeId, limit: MAX_NEIGHBOR_ROWS },
  );
  return rows as unknown as ProcessNeighborRow[];
};

/** L1/L2 범위 하위 L3·Task 이웃을 수집한다 */
export const collectProcessScopeNeighbors = async (
  scopeNodeId: number,
  options: {
    showInterfaces: boolean;
    showTables: boolean;
  },
): Promise<GraphNeighborBundle> => {
  const nodes: OperationsGraphNode[] = [];
  const edges: OperationsGraphEdge[] = [];
  const nodeIds = new Set<string>();
  const centerId = buildGraphNodeId("L3", scopeNodeId);

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

  const descendantL3s = await listDescendantL3Processes(scopeNodeId);

  for (const l3 of descendantL3s) {
    const l3Node = toProcessNode(l3);
    addNode(l3Node);
    addEdge(centerId, l3Node.id, "CONTAINS");

    const bundle = await collectProcessNeighbors(l3.nodeId, "L3", options);
    for (const node of bundle.nodes) {
      addNode(node);
    }
    for (const edge of bundle.edges) {
      addEdge(edge.source, edge.target, edge.kind, edge.label);
    }
  }

  return { nodes, edges };
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
    const childNodeIds = new Set(children.map((child) => child.nodeId));

    for (const child of children) {
      const childNode = toProcessNode(child);
      addNode(childNode);
      addEdge(centerId, childNode.id, "CONTAINS");
    }

    for (const child of children) {
      const predecessors = await listTaskPredecessors(child.nodeId);
      const l3Preds: PredecessorRow[] = [];
      const taskPreds: PredecessorRow[] = [];

      for (const pred of predecessors) {
        if (pred.predecessorLevel === "L3") {
          l3Preds.push(pred);
        } else if (childNodeIds.has(pred.predecessorNodeId)) {
          taskPreds.push(pred);
        }
      }

      for (const l3Pred of l3Preds) {
        const predNode: OperationsGraphNode = {
          id: buildGraphNodeId("L3", l3Pred.predecessorNodeId),
          kind: "L3",
          label: l3Pred.predecessorName,
          code: l3Pred.predecessorCode,
          sourceId: l3Pred.predecessorNodeId,
          meta: { inTaskFlow: true },
        };
        addNode(predNode);
        addEdge(
          predNode.id,
          buildGraphNodeId("TASK", child.nodeId),
          "PRECEDES",
        );

        if (taskPreds.length > 0) {
          for (const taskPred of taskPreds) {
            addEdge(
              buildGraphNodeId("TASK", taskPred.predecessorNodeId),
              predNode.id,
              "PRECEDES",
            );
          }
        } else {
          const childIndex = children.findIndex(
            (item) => item.nodeId === child.nodeId,
          );
          if (childIndex > 0) {
            addEdge(
              buildGraphNodeId("TASK", children[childIndex - 1]!.nodeId),
              predNode.id,
              "PRECEDES",
            );
          }
        }
      }

      if (l3Preds.length === 0) {
        for (const taskPred of taskPreds) {
          addEdge(
            buildGraphNodeId("TASK", taskPred.predecessorNodeId),
            buildGraphNodeId("TASK", child.nodeId),
            "PRECEDES",
          );
        }
      }
    }
  }

  const predecessors = await listTaskPredecessors(nodeId);
  for (const pred of predecessors) {
    const isL3Pred = pred.predecessorLevel === "L3";
    const predNode: OperationsGraphNode = {
      id: buildGraphNodeId(isL3Pred ? "L3" : "TASK", pred.predecessorNodeId),
      kind: isL3Pred ? "L3" : "TASK",
      label: pred.predecessorName,
      code: pred.predecessorCode,
      sourceId: pred.predecessorNodeId,
      meta: isL3Pred ? { inTaskFlow: true } : undefined,
    };
    addNode(predNode);
    addEdge(predNode.id, centerId, "PRECEDES");
  }

  const tableLinks = options.showTables
    ? await listTaskTableLinks(nodeId)
    : [];

  const systems = await listTaskSystemMappings(nodeId);
  for (const sys of systems) {
    const appId = buildGraphNodeId("APPLICATION", sys.systemId);
    const appNode = toApplicationNode(sys);
    addNode(appNode);
    addEdge(centerId, appId, "USES_SCREEN");

    const sysTables = tableLinks.filter((table) => table.systemId === sys.systemId);

    if (options.showTables) {
      for (const table of sysTables) {
        const tableNode = toTableNode(table);
        addNode(tableNode);
        const edgeKind: GraphEdgeKind =
          table.crudType === "R" || table.crudType === "RU"
            ? "READS_TABLE"
            : "WRITES_TABLE";
        addEdge(appId, tableNode.id, edgeKind, table.crudType ?? undefined);
      }
    }

    if (options.showInterfaces) {
      const interfaces = await listSystemInterfaces(sys.systemId);
      for (const iface of interfaces) {
        const ifaceNode = toInterfaceNode(iface);
        addNode(ifaceNode);

        if (sysTables.length > 0) {
          for (const table of sysTables) {
            const tableId = buildTableNodeId(
              table.systemId,
              table.schemaName,
              table.tableName,
            );
            addEdge(tableId, ifaceNode.id, "INTERFACE");
          }
        } else {
          addEdge(appId, ifaceNode.id, "INTERFACE");
        }
      }
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
     FROM task_system_link tsl
     INNER JOIN process_node pn ON pn.node_id = tsl.node_id
     WHERE tsl.system_id = @systemId
     ORDER BY pn.code`,
    { systemId, limit: MAX_NEIGHBOR_ROWS },
  );

  for (const row of taskRows) {
    const taskNode = toProcessNode(row as unknown as ProcessNeighborRow);
    nodes.push(taskNode);
    edges.push({
      id: `USES_SYSTEM:${taskNode.id}->${centerId}`,
      source: taskNode.id,
      target: centerId,
      kind: "USES_SCREEN",
    });
  }

  const tableRows = await query<Record<string, unknown>>(
    `SELECT TOP (@limit)
       link.system_id AS systemId,
       s.system_code AS systemCode,
       s.system_name AS systemName,
       link.schema_name AS schemaName,
       link.table_name AS tableName,
       link.table_name_kor AS tableNameKor,
       link.crud_type AS crudType,
       link.is_critical AS isCritical,
       link.node_id AS nodeId
     FROM task_data_table_link link
     INNER JOIN application_system s ON s.system_id = link.system_id
     WHERE link.system_id = @systemId
     ORDER BY link.table_name`,
    { systemId, limit: MAX_NEIGHBOR_ROWS },
  );

  const tableLinks = tableRows as unknown as TableLinkRow[];
  const tableIds: string[] = [];

  for (const table of tableLinks) {
    const tableNode = toTableNode(table);
    nodes.push(tableNode);
    tableIds.push(tableNode.id);
    const edgeKind: GraphEdgeKind =
      table.crudType === "R" || table.crudType === "RU"
        ? "READS_TABLE"
        : "WRITES_TABLE";
    edges.push({
      id: `${edgeKind}:${centerId}->${tableNode.id}`,
      source: centerId,
      target: tableNode.id,
      kind: edgeKind,
      label: table.crudType ?? undefined,
    });
  }

  if (options.showInterfaces) {
    const interfaces = await listSystemInterfaces(systemId);
    for (const iface of interfaces) {
      const ifaceNode = toInterfaceNode(iface);
      nodes.push(ifaceNode);

      if (tableIds.length > 0) {
        for (const tableId of tableIds) {
          edges.push({
            id: `INTERFACE:${tableId}->${ifaceNode.id}`,
            source: tableId,
            target: ifaceNode.id,
            kind: "INTERFACE",
          });
        }
      } else {
        edges.push({
          id: `INTERFACE:${centerId}->${ifaceNode.id}`,
          source: centerId,
          target: ifaceNode.id,
          kind: "INTERFACE",
        });
      }
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

  const appId = buildGraphNodeId("APPLICATION", systemId);

  if (systemRow) {
    const appNode: OperationsGraphNode = {
      id: appId,
      kind: "APPLICATION",
      label: systemRow.systemName as string,
      code: systemRow.systemCode as string,
      sourceId: systemId,
    };
    nodes.push(appNode);
    edges.push({
      id: `READS_TABLE:${appId}->${centerId}`,
      source: appId,
      target: centerId,
      kind: "READS_TABLE",
    });
  }

  const tasks = await listTasksByTable(systemId, schemaName, tableName);
  for (const task of tasks) {
    const taskNode = toProcessNode(task);
    nodes.push(taskNode);
    edges.push({
      id: `USES_SCREEN:${taskNode.id}->${appId}`,
      source: taskNode.id,
      target: appId,
      kind: "USES_SCREEN",
    });
  }

  return { nodes, edges };
};

/** E2E 프로세스 단건 조회 (그래프용) */
export const findGraphE2eProcess = async (
  e2eProcessId: number,
): Promise<{
  e2eProcessId: number;
  code: string;
  name: string;
  status: string;
} | null> => {
  const row = await queryOne<Record<string, unknown>>(
    `SELECT e2e_process_id AS e2eProcessId, code, name, status
     FROM e2e_process WHERE e2e_process_id = @e2eProcessId`,
    { e2eProcessId },
  );
  return row
    ? {
        e2eProcessId: row.e2eProcessId as number,
        code: row.code as string,
        name: row.name as string,
        status: row.status as string,
      }
    : null;
};

/** E2E BPMN Call Activity L3 연결 + sequenceFlow 기반 이웃 수집 */
export const collectE2eGraphNeighbors = async (
  e2eProcessId: number,
  options: {
    showInterfaces: boolean;
    showTables: boolean;
    includeL3Children?: boolean;
  },
): Promise<GraphNeighborBundle> => {
  const { derivePredecessorsFromBpmn } = await import(
    "@/lib/utils/bpmn-predecessor-sync"
  );

  const nodes: OperationsGraphNode[] = [];
  const edges: OperationsGraphEdge[] = [];
  const nodeIds = new Set<string>();
  const e2eCenterId = buildGraphNodeId("E2E", e2eProcessId);

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

  const modelRow = await queryOne<Record<string, unknown>>(
    `SELECT TOP 1 model_id AS modelId, bpmn_xml AS bpmnXml
     FROM bpmn_model
     WHERE e2e_process_id = @e2eProcessId AND is_current = 1
     ORDER BY updated_at DESC, model_id DESC`,
    { e2eProcessId },
  );

  if (!modelRow?.modelId) {
    return { nodes, edges };
  }

  const modelId = modelRow.modelId as number;
  const bpmnXml = (modelRow.bpmnXml as string | null) ?? null;

  const elementRows = await query<Record<string, unknown>>(
    `SELECT e.element_bpmn_id AS elementBpmnId,
            e.element_type AS elementType,
            e.linked_node_id AS linkedNodeId,
            p.code AS linkedCode,
            p.name AS linkedName,
            p.level AS linkedLevel,
            p.status AS linkedStatus
     FROM bpmn_element e
     LEFT JOIN process_node p ON p.node_id = e.linked_node_id
     WHERE e.model_id = @modelId AND e.linked_node_id IS NOT NULL`,
    { modelId },
  );

  const elements = elementRows.map((row) => ({
    elementBpmnId: row.elementBpmnId as string,
    elementType: row.elementType as string,
    linkedNodeId: row.linkedNodeId as number,
  }));

  const linkedL3Ids = new Set<number>();
  for (const row of elementRows) {
    if (row.linkedLevel !== "L3") {
      continue;
    }
    const l3Id = row.linkedNodeId as number;
    linkedL3Ids.add(l3Id);
    const l3Node: OperationsGraphNode = {
      id: buildGraphNodeId("L3", l3Id),
      kind: "L3",
      label: row.linkedName as string,
      code: row.linkedCode as string,
      status: row.linkedStatus as string,
      sourceId: l3Id,
      meta: { inE2eFlow: true },
    };
    addNode(l3Node);
    addEdge(e2eCenterId, l3Node.id, "CONTAINS");
  }

  const predecessors = derivePredecessorsFromBpmn(
    bpmnXml,
    elements.map((el) => ({
      elementBpmnId: el.elementBpmnId,
      elementType: el.elementType as import("@/types/bpmn").BpmnElementType,
      linkedNodeId: el.linkedNodeId,
    })),
  );

  for (const pair of predecessors) {
    if (!linkedL3Ids.has(pair.nodeId) || !linkedL3Ids.has(pair.predecessorNodeId)) {
      continue;
    }
    addEdge(
      buildGraphNodeId("L3", pair.predecessorNodeId),
      buildGraphNodeId("L3", pair.nodeId),
      "PRECEDES",
    );
  }

  if (options.includeL3Children) {
    for (const l3Id of linkedL3Ids) {
      const bundle = await collectProcessNeighbors(l3Id, "L3", {
        showInterfaces: options.showInterfaces,
        showTables: options.showTables,
      });
      for (const node of bundle.nodes) {
        addNode(node);
      }
      for (const edge of bundle.edges) {
        addEdge(edge.source, edge.target, edge.kind, edge.label);
      }
    }
  }

  return { nodes, edges };
};

export type { GraphNodeKind };
