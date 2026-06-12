import "server-only";

import { ApiError } from "@/lib/api/error-handler";
import type { Locale } from "@/lib/i18n/config";
import {
  buildOverlayProcessTree,
  buildProcessTree,
  bumpVersion,
  getNextLevel,
} from "@/lib/utils/process";
import type {
  CreateProcessDto,
  CreateVariantDto,
  MoveProcessDto,
  ProcessDeleteImpact,
  ProcessFilters,
  ProcessHistoryDto,
  ProcessI18nMap,
  ProcessNodeDto,
  ProcessNodeTree,
  ProcessStatus,
  StandardVariantCompareDto,
  UpdateProcessDto,
} from "@/types/process";

import * as commonCodeQueries from "@/lib/db/queries/common-code";
import * as processQueries from "@/lib/db/queries/process";

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

/** 프로세스 트리 조회 */
export const getProcessTree = async (
  locale: Locale,
  filters: ProcessFilters = {},
): Promise<ProcessNodeTree[]> => {
  const search = filters.search;
  const scopeLookup = await loadScopeNameLookup(locale);
  const standardNodes = await processQueries.listProcessNodes({ search });
  const standardDtos = await toProcessTreeNodes(standardNodes, locale, {
    scopeLookup,
  });

  const hasOverlayScope = Boolean(
    filters.companyCode?.trim() && filters.businessUnitCode?.trim(),
  );

  if (!hasOverlayScope) {
    const variantCounts = await processQueries.countVariantsByStandardIds(
      standardNodes
        .filter((node) => node.level === "L3" || node.level === "L4")
        .map((node) => node.nodeId),
    );

    const withCounts = standardDtos.map((node) => ({
      ...node,
      variantCount: variantCounts.get(node.nodeId) ?? 0,
    }));

    return buildProcessTree(withCounts);
  }

  const variantNodes = await processQueries.listVariantsByScope(
    filters.companyCode!.trim(),
    filters.businessUnitCode!.trim(),
    search,
  );
  const variantDtos = await toProcessTreeNodes(variantNodes, locale, {
    scopeLookup,
  });

  return buildOverlayProcessTree(standardDtos, variantDtos);
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
  if (!level) {
    if (dto.parentNodeId) {
      const parent = await processQueries.findProcessById(dto.parentNodeId);
      level = parent ? getNextLevel(parent.level) : "L1";
    } else {
      level = "L1";
    }
  }

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
    isStandard: dto.isStandard ?? true,
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

  if (!standard.isStandard || standard.variantOf != null) {
    throw new ApiError(
      "E405",
      "Only standard processes can create variants",
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

  if (
    await processQueries.existsVariantScope(
      standardNodeId,
      companyCode,
      businessUnitCode,
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
    companyCode,
    businessUnitCode,
  );

  const existingCode = await processQueries.findProcessByCode(code);
  if (existingCode) {
    throw new ApiError("E304", "Variant code already exists", 409, undefined, "code");
  }

  let parentNodeId = standard.parentNodeId;
  if (standard.level === "L4" && standard.parentNodeId) {
    const parentVariant = await processQueries.findVariantByScope(
      standard.parentNodeId,
      companyCode,
      businessUnitCode,
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
    companyCode,
    businessUnitCode,
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

  return {
    standard,
    variant,
    diffRows,
  };
};

/** 프로세스 삭제 */
export const deleteProcess = async (
  nodeId: number,
  options: { cascade?: boolean } = {},
): Promise<void> => {
  const current = await processQueries.findProcessById(nodeId);
  if (!current) {
    throw new ApiError("E302", "Process not found", 404);
  }

  if (current.variantOf == null) {
    const variantCount = await processQueries.countVariantsForStandard(nodeId);
    if (variantCount > 0) {
      throw new ApiError(
        "E401",
        "Cannot delete standard process with existing variants",
        400,
      );
    }
  }

  const impact = await processQueries.getProcessDeleteImpact(nodeId);
  if (impact.childProcessCount > 0) {
    throw new ApiError("E401", "Cannot delete: child processes exist", 400);
  }
  if (impact.hasDependencies && !options.cascade) {
    throw new ApiError(
      "E409",
      "Linked data exists. Confirm cascade delete before deleting this process.",
      409,
    );
  }

  const deleted = await processQueries.deleteProcess(nodeId, options);
  if (!deleted) {
    throw new ApiError("E502", "Failed to delete process", 500);
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
