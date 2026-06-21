import "server-only";

import { ApiError } from "@/lib/api/error-handler";
import type { Locale } from "@/lib/i18n/config";
import {
  ENTERPRISE_BUSINESS_UNIT_CODE,
  ENTERPRISE_COMPANY_CODE,
} from "@/lib/constants/process-scope";
import {
  buildHybridProcessTree,
  bumpVersion,
  getNextLevel,
  resolveProcessTreeViewMode,
} from "@/lib/utils/process";
import {
  isEnterpriseScope,
  isSameScope,
  normalizeProcessScope,
  type ProcessScopePair,
} from "@/lib/utils/process-scope";
import type { TaskAttributeI18nMap } from "@/types/metadata";
import type {
  CreateProcessDto,
  CreateVariantDto,
  MoveProcessDto,
  ProcessDeleteImpact,
  ProcessFilters,
  ProcessHistoryDto,
  ProcessI18nMap,
  ProcessLevel,
  ProcessNodeDto,
  ProcessNodeTree,
  ProcessScopeMode,
  ProcessStatus,
  StandardVariantCompareDto,
  UpdateProcessDto,
} from "@/types/process";

import * as commonCodeQueries from "@/lib/db/queries/common-code";
import * as metadataQueries from "@/lib/db/queries/metadata";
import * as processQueries from "@/lib/db/queries/process";
import * as bpmnQueries from "@/lib/db/queries/bpmn";
import {
  copyBpmnForVariant,
  copyMetadataForL3Variant,
  copyMetadataForVariantNode,
  ensureL4VariantsForL3,
  updateL4VariantBpmnLink,
} from "@/lib/services/variant-copy.service";
import { diffBpmnXml } from "@/lib/utils/bpmn-xml";

type ScopeNameLookup = {
  companyNames: Map<string, string>;
  businessUnitNames: Map<string, string>;
};

/** 공통코드 lookup으로 scope 표시명 맵을 만든다 */
const loadScopeNameLookup = async (locale: Locale): Promise<ScopeNameLookup> => {
  const [companyCodes, businessUnitCodes] = await Promise.all([
    commonCodeQueries.lookupCommonCodesByGroupCode("COMPANY_CD", locale),
    commonCodeQueries.lookupCommonCodesByGroupCode("BU_CD", locale),
  ]);

  return {
    companyNames: new Map(
      companyCodes.map((item) => [item.code, item.displayName]),
    ),
    businessUnitNames: new Map(
      businessUnitCodes.map((item) => [item.code, item.displayName]),
    ),
  };
};

/** 노드를 DTO로 변환 (locale 적용) */
const toProcessDto = async (
  node: NonNullable<Awaited<ReturnType<typeof processQueries.findProcessById>>>,
  locale: Locale,
  scopeLookup?: ScopeNameLookup,
  options?: {
    variantCount?: number;
    standardProcess?: ProcessNodeDto["standardProcess"];
  },
): Promise<ProcessNodeDto> => {
  const i18n = await processQueries.findProcessI18n(node.nodeId);
  const lookup = scopeLookup ?? (await loadScopeNameLookup(locale));

  return {
    ...node,
    i18n,
    displayName: processQueries.resolveDisplayName(node, i18n, locale),
    displayDescription:
      i18n[locale]?.description ?? i18n.ko?.description ?? node.description,
    companyName: node.companyCode
      ? (lookup.companyNames.get(node.companyCode) ?? node.companyCode)
      : null,
    businessUnitName: node.businessUnitCode
      ? (lookup.businessUnitNames.get(node.businessUnitCode) ??
        node.businessUnitCode)
      : null,
    variantCount: options?.variantCount,
    standardProcess: options?.standardProcess ?? null,
  };
};

/** i18n에서 ko 이름 추출 (필수) */
const resolveKoName = (dto: CreateProcessDto | UpdateProcessDto): string => {
  const koName = dto.i18n?.ko?.name ?? ("name" in dto ? dto.name : undefined);
  if (!koName?.trim()) {
    throw new ApiError("E001", "Process name is required", 400, undefined, "name");
  }
  return koName.trim();
};

const toProcessTreeNodes = async (
  nodes: Awaited<ReturnType<typeof processQueries.listProcessNodes>>,
  locale: Locale,
  options?: {
    variantCounts?: Map<number, number>;
    scopeLookup?: ScopeNameLookup;
  },
): Promise<ProcessNodeTree[]> => {
  const scopeLookup = options?.scopeLookup ?? (await loadScopeNameLookup(locale));
  const dtos: ProcessNodeTree[] = [];

  for (const node of nodes) {
    const dto = await toProcessDto(node, locale, scopeLookup, {
      variantCount: options?.variantCounts?.get(node.nodeId),
    });
    dtos.push({ ...dto, name: dto.displayName ?? dto.name });
  }

  return dtos;
};

/** 등록 시 scope를 결정한다 — L4는 부모 상속, L3는 전사/특정 조직 선택 */
const resolveCreateScope = (
  level: ProcessLevel,
  parent: Awaited<ReturnType<typeof processQueries.findProcessById>> | null,
  dto: CreateProcessDto,
): ProcessScopePair => {
  if (level === "L1" || level === "L2") {
    return {
      companyCode: ENTERPRISE_COMPANY_CODE,
      businessUnitCode: ENTERPRISE_BUSINESS_UNIT_CODE,
    };
  }

  if (parent && level === "L4") {
    return normalizeProcessScope(parent.companyCode, parent.businessUnitCode);
  }

  if (parent && level === "L3") {
    const scopeMode: ProcessScopeMode = dto.scopeMode ?? "enterprise";
    if (scopeMode === "scoped") {
      const companyCode = dto.companyCode?.trim();
      const businessUnitCode = dto.businessUnitCode?.trim();
      if (!companyCode || !businessUnitCode) {
        throw new ApiError(
          "E001",
          "Company and business unit are required for scoped process",
          400,
          undefined,
          "companyCode",
        );
      }
      return { companyCode, businessUnitCode };
    }
    return {
      companyCode: ENTERPRISE_COMPANY_CODE,
      businessUnitCode: ENTERPRISE_BUSINESS_UNIT_CODE,
    };
  }

  return {
    companyCode: ENTERPRISE_COMPANY_CODE,
    businessUnitCode: ENTERPRISE_BUSINESS_UNIT_CODE,
  };
};

/** 프로세스 기본정보(명칭·설명)에서 Task 업무정의 값을 구성한다. */
const buildTaskDefinitionFromProcessBasicInfo = (
  name: string,
  description: string | null,
  i18n: ProcessI18nMap,
): { definition: string; i18n: TaskAttributeI18nMap } => {
  const resolveDefinition = (processName: string, processDescription?: string | null): string =>
    processDescription?.trim() || processName.trim();

  const koDefinition = resolveDefinition(name, description);
  const taskI18n: TaskAttributeI18nMap = {
    ko: { definition: koDefinition },
  };

  for (const [locale, value] of Object.entries(i18n)) {
    if (!value || locale === "ko") {
      continue;
    }
    taskI18n[locale as keyof TaskAttributeI18nMap] = {
      definition: resolveDefinition(value.name, value.description),
    };
  }

  return { definition: koDefinition, i18n: taskI18n };
};

/** L4 프로세스 등록 시 Task 속성 초기 레코드를 생성한다. */
const createInitialTaskAttributeForL4 = async (
  nodeId: number,
  name: string,
  description: string | null,
  i18n: ProcessI18nMap,
  version: string,
  userId?: number,
): Promise<void> => {
  const { definition, i18n: taskI18n } = buildTaskDefinitionFromProcessBasicInfo(
    name,
    description,
    i18n,
  );

  const attribute = await metadataQueries.upsertTaskAttribute({
    nodeId,
    definition,
    version,
    createdBy: userId ?? null,
    updatedBy: userId ?? null,
  });

  await metadataQueries.upsertTaskAttributeI18n(attribute.attrId, taskI18n);
};

/** 프로세스 트리 조회 */
export const getProcessTree = async (
  locale: Locale,
  filters: ProcessFilters = {},
): Promise<ProcessNodeTree[]> => {
  const search = filters.search;
  const viewMode =
    filters.viewMode ??
    resolveProcessTreeViewMode(filters.companyCode, filters.businessUnitCode);
  const scopeLookup = await loadScopeNameLookup(locale);
  const baseNodes = await processQueries.listProcessNodes({ search });
  const variantCounts = await processQueries.countVariantsByStandardIds(
    baseNodes
      .filter((node) => node.level === "L3" || node.level === "L4")
      .map((node) => node.nodeId),
  );
  const baseDtos = await toProcessTreeNodes(baseNodes, locale, {
    scopeLookup,
    variantCounts,
  });

  let variantDtos: ProcessNodeTree[] = [];
  if (viewMode === "organization") {
    const variantNodes = await processQueries.listVariantsByScope(
      filters.companyCode!.trim(),
      filters.businessUnitCode!.trim(),
      search,
    );
    variantDtos = await toProcessTreeNodes(variantNodes, locale, { scopeLookup });
  }

  return buildHybridProcessTree(
    baseDtos,
    variantDtos,
    viewMode,
    viewMode === "organization"
      ? normalizeProcessScope(filters.companyCode, filters.businessUnitCode)
      : undefined,
  );
};

/** 프로세스 상세 */
export const getProcessDetail = async (
  nodeId: number,
  locale: Locale,
): Promise<ProcessNodeDto> => {
  const node = await processQueries.findProcessById(nodeId);
  if (!node) {
    throw new ApiError("E302", "Process not found", 404);
  }

  let standardProcess: ProcessNodeDto["standardProcess"] = null;
  if (node.variantOf) {
    const standard = await processQueries.findProcessById(node.variantOf);
    if (standard) {
      standardProcess = {
        nodeId: standard.nodeId,
        code: standard.code,
        name: standard.name,
      };
    }
  }

  const variantCount =
    node.variantOf == null && (node.level === "L3" || node.level === "L4")
      ? await processQueries.countVariantsForStandard(node.nodeId)
      : undefined;

  return toProcessDto(node, locale, undefined, {
    variantCount,
    standardProcess,
  });
};

/** 프로세스 생성 */
export const createProcess = async (
  dto: CreateProcessDto,
  locale: Locale,
  userId?: number,
): Promise<ProcessNodeDto> => {
  const koName = resolveKoName(dto);
  const koDesc = dto.i18n?.ko?.description ?? dto.description ?? null;

  let code = dto.code?.trim();
  if (dto.autoCode || !code) {
    code = await processQueries.generateProcessCode(dto.parentNodeId);
  }

  if (!code) {
    throw new ApiError("E001", "Process code is required", 400, undefined, "code");
  }

  const existing = await processQueries.findProcessByCode(code);
  if (existing) {
    throw new ApiError("E304", "Code already exists", 409, undefined, "code");
  }

  let level = dto.level;
  let parent = null;
  if (!level) {
    if (dto.parentNodeId) {
      parent = await processQueries.findProcessById(dto.parentNodeId);
      level = parent ? getNextLevel(parent.level) : "L1";
    } else {
      level = "L1";
    }
  } else if (dto.parentNodeId) {
    parent = await processQueries.findProcessById(dto.parentNodeId);
  }

  const scope = resolveCreateScope(level, parent, dto);
  const isStandard =
    dto.isStandard ??
    isEnterpriseScope(scope.companyCode, scope.businessUnitCode);

  const node = await processQueries.createProcess({
    parentNodeId: dto.parentNodeId,
    level,
    code,
    name: koName,
    description: koDesc,
    status: dto.status ?? "DRAFT",
    ownerOrgId: dto.ownerOrgId ?? null,
    version: dto.version ?? "1.0.0",
    validFrom: dto.validFrom ?? null,
    validTo: dto.validTo ?? null,
    isStandard,
    companyCode: scope.companyCode,
    businessUnitCode: scope.businessUnitCode,
    sortOrder: dto.sortOrder ?? 0,
    createdBy: userId ?? null,
  });

  const i18n: ProcessI18nMap = {
    ko: { name: koName, description: koDesc },
    ...dto.i18n,
  };
  await processQueries.upsertProcessI18n(node.nodeId, i18n);

  await processQueries.insertProcessHistory({
    nodeId: node.nodeId,
    version: node.version ?? "1.0.0",
    changeType: "CREATE",
    changeReason: "Initial creation",
    snapshotData: JSON.stringify(node),
    createdBy: userId ?? null,
  });

  if (level === "L4") {
    await createInitialTaskAttributeForL4(
      node.nodeId,
      koName,
      koDesc,
      i18n,
      node.version ?? "1.0.0",
      userId,
    );
  }

  return toProcessDto(node, locale);
};

/** 프로세스 수정 */
export const updateProcess = async (
  nodeId: number,
  dto: UpdateProcessDto,
  locale: Locale,
  userId?: number,
): Promise<ProcessNodeDto> => {
  const current = await processQueries.findProcessById(nodeId);
  if (!current) {
    throw new ApiError("E302", "Process not found", 404);
  }

  if (current.status === "IN_REVIEW") {
    throw new ApiError("E402", "Cannot modify item pending approval", 400);
  }

  if (
    current.status === "PUBLISHED" &&
    dto.status !== undefined &&
    dto.status !== "PUBLISHED"
  ) {
    throw new ApiError("E403", "Cannot directly modify Published status", 400);
  }

  const koName = dto.i18n?.ko?.name ?? dto.name;
  const newVersion = bumpVersion(current.version, "minor");

  const updated = await processQueries.updateProcess(nodeId, {
    name: koName ?? current.name,
    description: dto.i18n?.ko?.description ?? dto.description ?? current.description,
    status: dto.status,
    ownerOrgId: dto.ownerOrgId,
    version: newVersion,
    validFrom: dto.validFrom ?? undefined,
    validTo: dto.validTo ?? undefined,
    isStandard: dto.isStandard,
    sortOrder: dto.sortOrder,
    updatedBy: userId ?? null,
  });

  if (!updated) {
    throw new ApiError("E302", "Process not found", 404);
  }

  if (dto.i18n) {
    await processQueries.upsertProcessI18n(nodeId, dto.i18n);
  }

  await processQueries.insertProcessHistory({
    nodeId,
    version: newVersion,
    changeType: dto.status && dto.status !== current.status ? "STATUS_CHANGE" : "UPDATE",
    changeReason: "Process updated",
    snapshotData: JSON.stringify(updated),
    createdBy: userId ?? null,
  });

  return toProcessDto(updated, locale);
};

/** 표준 프로세스의 변형 목록 */
export const listVariantsByStandard = async (
  standardNodeId: number,
  locale: Locale,
): Promise<ProcessNodeDto[]> => {
  const standard = await processQueries.findProcessById(standardNodeId);
  if (!standard) {
    throw new ApiError("E302", "Process not found", 404);
  }

  const variants = await processQueries.findVariantsByStandardId(standardNodeId);
  const scopeLookup = await loadScopeNameLookup(locale);

  return Promise.all(
    variants.map((variant) =>
      toProcessDto(variant, locale, scopeLookup, {
        standardProcess: {
          nodeId: standard.nodeId,
          code: standard.code,
          name: standard.name,
        },
      }),
    ),
  );
};

/** 표준 프로세스에서 법인·사업부 변형 생성 */
export const createVariantFromStandard = async (
  standardNodeId: number,
  dto: CreateVariantDto,
  locale: Locale,
  userId?: number,
): Promise<ProcessNodeDto> => {
  const standard = await processQueries.findProcessById(standardNodeId);
  if (!standard) {
    throw new ApiError("E302", "Process not found", 404);
  }

  if (standard.variantOf != null) {
    throw new ApiError(
      "E405",
      "Variants cannot be created from another variant",
      400,
    );
  }

  if (standard.level !== "L3" && standard.level !== "L4") {
    throw new ApiError(
      "E405",
      "Variants can only be created from L3 or L4 standard processes",
      400,
    );
  }

  const companyCode = dto.companyCode.trim();
  const businessUnitCode = dto.businessUnitCode.trim();
  if (!companyCode || !businessUnitCode) {
    throw new ApiError(
      "E001",
      "Company and business unit are required",
      400,
      undefined,
      "companyCode",
    );
  }

  const baseScope = normalizeProcessScope(
    standard.companyCode,
    standard.businessUnitCode,
  );
  const targetScope = normalizeProcessScope(companyCode, businessUnitCode);

  if (isSameScope(baseScope, targetScope)) {
    throw new ApiError(
      "E405",
      "Variant scope must differ from the base process scope",
      400,
    );
  }

  if (
    await processQueries.existsVariantScope(
      standardNodeId,
      targetScope.companyCode,
      targetScope.businessUnitCode,
    )
  ) {
    throw new ApiError(
      "E304",
      "Duplicate variant for company and business unit",
      409,
    );
  }

  const code = processQueries.generateVariantCode(
    standard.code,
    targetScope.companyCode,
    targetScope.businessUnitCode,
  );

  const existingCode = await processQueries.findProcessByCode(code);
  if (existingCode) {
    throw new ApiError("E304", "Variant code already exists", 409, undefined, "code");
  }

  let parentNodeId = standard.parentNodeId;
  if (standard.level === "L4" && standard.parentNodeId) {
    const parentVariant = await processQueries.findVariantByScope(
      standard.parentNodeId,
      targetScope.companyCode,
      targetScope.businessUnitCode,
    );
    if (parentVariant) {
      parentNodeId = parentVariant.nodeId;
    }
  }

  const standardI18n = await processQueries.findProcessI18n(standardNodeId);
  const node = await processQueries.createProcess({
    parentNodeId,
    level: standard.level,
    code,
    name: standard.name,
    description: standard.description,
    status: "DRAFT",
    ownerOrgId: standard.ownerOrgId,
    version: "1.0.0",
    validFrom: standard.validFrom
      ? standard.validFrom.toISOString().slice(0, 10)
      : null,
    validTo: standard.validTo
      ? standard.validTo.toISOString().slice(0, 10)
      : null,
    isStandard: false,
    variantOf: standardNodeId,
    companyCode: targetScope.companyCode,
    businessUnitCode: targetScope.businessUnitCode,
    sortOrder: standard.sortOrder,
    createdBy: userId ?? null,
  });

  await processQueries.upsertProcessI18n(node.nodeId, standardI18n);

  await processQueries.insertProcessHistory({
    nodeId: node.nodeId,
    version: node.version ?? "1.0.0",
    changeType: "CREATE",
    changeReason: `Variant created from standard ${standard.code}`,
    snapshotData: JSON.stringify(node),
    createdBy: userId ?? null,
  });

  const shouldCopyBpmn = dto.copyBpmn ?? standard.level === "L3";
  const shouldCopyMetadata = dto.copyMetadata ?? false;

  if (standard.level === "L3") {
    let l4Mapping: Map<number, number> | undefined;

    if (shouldCopyBpmn || shouldCopyMetadata) {
      l4Mapping = await ensureL4VariantsForL3(
        standardNodeId,
        node.nodeId,
        targetScope,
        userId,
      );
    }

    if (shouldCopyBpmn) {
      await copyBpmnForVariant(
        standardNodeId,
        node.nodeId,
        targetScope,
        userId,
        l4Mapping,
      );
    }

    if (shouldCopyMetadata && l4Mapping) {
      await copyMetadataForL3Variant(l4Mapping, userId);
    }
  }

  if (standard.level === "L4") {
    if (shouldCopyMetadata) {
      await copyMetadataForVariantNode(standardNodeId, node.nodeId, userId);
    }

    if (shouldCopyBpmn) {
      await updateL4VariantBpmnLink(
        standardNodeId,
        node.nodeId,
        targetScope,
      );
    }
  }

  return toProcessDto(node, locale, undefined, {
    standardProcess: {
      nodeId: standard.nodeId,
      code: standard.code,
      name: standard.name,
    },
  });
};

/** 표준·변형 비교 */
export const compareStandardVariant = async (
  standardNodeId: number,
  companyCode: string,
  businessUnitCode: string,
  locale: Locale,
): Promise<StandardVariantCompareDto> => {
  const standard = await getProcessDetail(standardNodeId, locale);
  const variantNode = await processQueries.findVariantByScope(
    standardNodeId,
    companyCode.trim(),
    businessUnitCode.trim(),
  );

  const variant = variantNode
    ? await toProcessDto(variantNode, locale, undefined, {
        standardProcess: {
          nodeId: standard.nodeId,
          code: standard.code,
          name: standard.name,
        },
      })
    : null;

  const compareKeys = [
    "code",
    "name",
    "description",
    "status",
    "version",
    "level",
  ] as const;

  const diffRows = compareKeys.map((key) => {
    const standardValue = String(standard[key] ?? "-");
    const variantValue = String(variant?.[key] ?? "-");
    return {
      key,
      standardValue,
      variantValue,
      changed: variant ? standardValue !== variantValue : false,
    };
  });

  let bpmnCompare = null;
  if (standard.level === "L3" && variant) {
    const standardModel = await bpmnQueries.findCurrentBpmnModelByNodeId(
      standardNodeId,
    );
    const variantModel = await bpmnQueries.findCurrentBpmnModelByNodeId(
      variant.nodeId,
    );

    bpmnCompare = {
      standardModelId: standardModel?.modelId ?? null,
      variantModelId: variantModel?.modelId ?? null,
      diff:
        standardModel?.bpmnXml && variantModel?.bpmnXml
          ? diffBpmnXml(standardModel.bpmnXml, variantModel.bpmnXml)
          : [],
    };
  }

  return {
    standard,
    variant,
    diffRows,
    bpmnCompare,
  };
};

/** 프로세스 삭제 — L3는 직계 L4까지, L1/L2·변형 보유 시 제한 */
export const deleteProcess = async (nodeId: number): Promise<void> => {
  const current = await processQueries.findProcessById(nodeId);
  if (!current) {
    throw new ApiError("E302", "Process not found", 404);
  }

  const impact = await processQueries.getProcessDeleteImpact(nodeId);

  if (impact.blockedByVariants) {
    throw new ApiError(
      "E401",
      "Cannot delete standard process with existing variants",
      400,
    );
  }

  if (impact.blockedByChildren) {
    throw new ApiError("E401", "Cannot delete: child processes exist", 400);
  }

  const deleteOrder = [
    ...impact.cascadeChildProcesses.map((child) => child.nodeId),
    nodeId,
  ];

  for (const targetNodeId of deleteOrder) {
    const deleted = await processQueries.deleteProcess(targetNodeId);
    if (!deleted) {
      throw new ApiError("E502", "Failed to delete process", 500);
    }
  }
};

/** 프로세스 삭제 전 영향 범위 조회 */
export const getProcessDeleteImpact = async (
  nodeId: number,
): Promise<ProcessDeleteImpact> => {
  const current = await processQueries.findProcessById(nodeId);
  if (!current) {
    throw new ApiError("E302", "Process not found", 404);
  }

  return processQueries.getProcessDeleteImpact(nodeId);
};

/** 프로세스 이동 */
export const moveProcess = async (
  nodeId: number,
  dto: MoveProcessDto,
  locale: Locale,
): Promise<ProcessNodeDto> => {
  const current = await processQueries.findProcessById(nodeId);
  if (!current) {
    throw new ApiError("E302", "Process not found", 404);
  }

  const circular = await processQueries.isCircularReference(
    nodeId,
    dto.parentNodeId,
  );
  if (circular) {
    throw new ApiError("E404", "Circular reference detected", 400);
  }

  const moved = await processQueries.moveProcess(
    nodeId,
    dto.parentNodeId,
    dto.sortOrder,
  );

  if (!moved) {
    throw new ApiError("E502", "Failed to move process", 500);
  }

  return toProcessDto(moved, locale);
};

/** 버전 이력 조회 */
export const getProcessHistory = async (
  nodeId: number,
): Promise<ProcessHistoryDto[]> => {
  const rows = await processQueries.listProcessHistory(nodeId);
  return rows.map((row) => ({
    historyId: row.history_id as number,
    nodeId: row.node_id as number,
    version: row.version as string,
    changeType: row.change_type as ProcessHistoryDto["changeType"],
    changeReason: (row.change_reason as string | null) ?? null,
    createdAt: new Date(row.created_at as string),
    snapshotData: row.snapshot_data
      ? (JSON.parse(row.snapshot_data as string) as Record<string, unknown>)
      : null,
  }));
};

/** 승인 요청 — DRAFT → IN_REVIEW */
export const requestApproval = async (
  nodeId: number,
  requesterId: number,
  comment?: string | null,
): Promise<{ requestId: number }> => {
  const node = await processQueries.findProcessById(nodeId);
  if (!node) {
    throw new ApiError("E302", "Process not found", 404);
  }

  if (!node.name?.trim()) {
    throw new ApiError("E405", "Required attributes missing for approval", 400);
  }

  if (node.status !== "DRAFT") {
    throw new ApiError("E402", "Cannot modify item pending approval", 400);
  }

  const pending = await processQueries.hasPendingApproval(nodeId);
  if (pending) {
    throw new ApiError("E402", "Cannot modify item pending approval", 400);
  }

  await processQueries.updateProcess(nodeId, { status: "IN_REVIEW" });

  const requestId = await processQueries.createApprovalRequest({
    entityId: nodeId,
    requestType: "PUBLISH",
    requesterId,
    comment,
  });

  return { requestId };
};

/** 승인/반려 */
export const handleApproval = async (input: {
  requestId: number;
  approverId: number;
  action: "APPROVE" | "REJECT";
  comment?: string | null;
  targetStatus?: ProcessStatus;
}): Promise<void> => {
  const request = await processQueries.findApprovalRequest(input.requestId);
  if (!request) {
    throw new ApiError("E301", "Requested data not found", 404);
  }

  const nodeId = request.entity_id as number;

  await processQueries.processApproval({
    requestId: input.requestId,
    approverId: input.approverId,
    action: input.action,
    comment: input.comment,
    newStatus: input.targetStatus ?? "APPROVED",
    nodeId,
  });

  if (input.action === "REJECT") {
    await processQueries.updateProcess(nodeId, { status: "DRAFT" });
  }
};

/** 승인 대기 목록 */
export const listPendingApprovals = async () => {
  return processQueries.listPendingApprovals();
};

/** 프로세스 상태 변경 */
export const changeProcessStatus = async (
  nodeId: number,
  status: ProcessStatus,
  locale: Locale,
  userId?: number,
): Promise<ProcessNodeDto> => {
  return updateProcess(nodeId, { status }, locale, userId);
};

/** 전체 목록 (flat) */
export const listProcesses = async (
  locale: Locale,
  filters: ProcessFilters = {},
) => {
  const nodes = await processQueries.listProcessNodes(filters);
  return Promise.all(nodes.map((n) => toProcessDto(n, locale)));
};
