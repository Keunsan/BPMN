import {
  ENTERPRISE_BUSINESS_UNIT_CODE,
  ENTERPRISE_COMPANY_CODE,
} from "@/lib/constants/process-scope";
import type { ProcessNode, ProcessNodeTree } from "@/types/process";

export type ProcessScopePair = {
  companyCode: string;
  businessUnitCode: string;
};

/** DB/레거시 NULL scope를 전사 공통 코드로 정규화한다 */
export const normalizeScopeCode = (code: string | null | undefined): string | null => {
  const trimmed = code?.trim();
  return trimmed ? trimmed : null;
};

export const normalizeProcessScope = (
  companyCode: string | null | undefined,
  businessUnitCode: string | null | undefined,
): ProcessScopePair => ({
  companyCode: normalizeScopeCode(companyCode) ?? ENTERPRISE_COMPANY_CODE,
  businessUnitCode: normalizeScopeCode(businessUnitCode) ?? ENTERPRISE_BUSINESS_UNIT_CODE,
});

/** 전사 공통 scope 여부 */
export const isEnterpriseScope = (
  companyCode: string | null | undefined,
  businessUnitCode: string | null | undefined,
): boolean => {
  const scope = normalizeProcessScope(companyCode, businessUnitCode);
  return (
    scope.companyCode === ENTERPRISE_COMPANY_CODE &&
    scope.businessUnitCode === ENTERPRISE_BUSINESS_UNIT_CODE
  );
};

/** 조직 E2E 조회에 포함되는 기준 노드인지 판별한다 */
export const isBaseVisibleInOrgView = (
  node: Pick<
    ProcessNode,
    "nodeId" | "level" | "variantOf" | "companyCode" | "businessUnitCode"
  >,
  companyCode: string,
  businessUnitCode: string,
  variantBaseIds: Set<number>,
): boolean => {
  if (node.variantOf != null) {
    return false;
  }

  if (node.level === "L1" || node.level === "L2") {
    return isEnterpriseScope(node.companyCode, node.businessUnitCode);
  }

  if (isEnterpriseScope(node.companyCode, node.businessUnitCode)) {
    return !variantBaseIds.has(node.nodeId);
  }

  const scope = normalizeProcessScope(node.companyCode, node.businessUnitCode);
  return (
    scope.companyCode === companyCode &&
    (scope.businessUnitCode === businessUnitCode ||
      scope.businessUnitCode === ENTERPRISE_BUSINESS_UNIT_CODE)
  );
};

/** 전사 공통 전용 조회에 포함되는 기준 노드인지 판별한다 */
export const isBaseVisibleInEnterpriseView = (
  node: Pick<ProcessNode, "variantOf" | "companyCode" | "businessUnitCode">,
): boolean => node.variantOf == null && isEnterpriseScope(node.companyCode, node.businessUnitCode);

/** 전체 카탈로그 조회에 포함되는 기준 노드인지 판별한다 */
export const isBaseVisibleInCatalogView = (
  node: Pick<ProcessNode, "variantOf">,
): boolean => node.variantOf == null;

/** 동일 scope 여부 */
export const isSameScope = (
  a: ProcessScopePair,
  b: ProcessScopePair,
): boolean => {
  const left = normalizeProcessScope(a.companyCode, a.businessUnitCode);
  const right = normalizeProcessScope(b.companyCode, b.businessUnitCode);
  return (
    left.companyCode === right.companyCode &&
    left.businessUnitCode === right.businessUnitCode
  );
};

export const getProcessScopeLabel = (
  node: Pick<
    ProcessNodeTree,
    "companyCode" | "businessUnitCode"
  > & {
    companyName?: string | null;
    businessUnitName?: string | null;
  },
): string => {
  if (isEnterpriseScope(node.companyCode, node.businessUnitCode)) {
    return "";
  }

  const company = node.companyName ?? node.companyCode ?? "";
  const bu = node.businessUnitName ?? node.businessUnitCode ?? "";
  return [company, bu].filter(Boolean).join(" · ");
};
