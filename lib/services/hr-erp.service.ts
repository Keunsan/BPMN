import "server-only";

import type { HrDepartment } from "@/types/hr-erp";
import type {
  OrganizationType,
  OrganizationUpsertInput,
} from "@/types/organization";

/** HR 부서 레벨을 organization.org_type으로 변환한다. */
export const mapHrLevelToOrgType = (level: number): OrganizationType => {
  if (level <= 1) return "COMPANY";
  if (level === 2) return "DIVISION";
  if (level === 3) return "DEPARTMENT";
  return "TEAM";
};

/** HR 부서 원본을 organization UPSERT 입력으로 변환한다. */
export const mapHrDepartmentToUpsertInput = (
  department: HrDepartment,
): OrganizationUpsertInput => ({
  orgCode: department.deptCode,
  orgName: department.deptName,
  orgType: mapHrLevelToOrgType(department.level),
  orgLevel: department.level,
  buCd: department.buCd || null,
  costCd: department.costCode || null,
  costName: department.costName || null,
  leaderEmployeeId: department.leaderEmployeeId,
  leaderName: department.leaderName,
  isLeaf: department.endDeptYn === "Y",
  source: "HR_ERP",
  isActive: true,
});

/** 상위 부서 코드가 유효한지 확인한다. */
export const resolveParentDeptCode = (
  parentDeptCode: string,
  deptCode: string,
): string | null => {
  const parent = parentDeptCode.trim();
  if (!parent || parent === deptCode) {
    return null;
  }
  return parent;
};
