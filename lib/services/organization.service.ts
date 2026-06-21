import "server-only";

import { fetchHrDepartments } from "@/lib/external/hr-erp.client";
import * as organizationQueries from "@/lib/db/queries/organization";
import {
  mapHrDepartmentToUpsertInput,
  resolveParentDeptCode,
} from "@/lib/services/hr-erp.service";
import type { HrDepartmentListResponse } from "@/types/hr-erp";
import type {
  OrganizationDto,
  OrganizationHrMergeInput,
  OrganizationListFilters,
  OrganizationSyncResult,
} from "@/types/organization";

/** HR ERP 부서 목록을 live 조회한다. */
export const listHrDepartments = async (): Promise<HrDepartmentListResponse> =>
  fetchHrDepartments();

/** 조직 목록을 조회한다. */
export const listOrganizations = async (
  filters: OrganizationListFilters = {},
): Promise<OrganizationDto[]> => organizationQueries.listOrganizations(filters);

/** HR ERP 부서 정보를 organization 테이블에 동기화한다. */
export const syncOrganizationsFromHr = async (): Promise<OrganizationSyncResult> => {
  const { data } = await fetchHrDepartments();

  const mergeRows: OrganizationHrMergeInput[] = data.map((department) => ({
    ...mapHrDepartmentToUpsertInput(department),
    parentOrgCode: resolveParentDeptCode(
      department.parentDeptCode,
      department.deptCode,
    ),
  }));

  const result = await organizationQueries.mergeOrganizationsFromHr(mergeRows);

  return {
    totalFetched: data.length,
    inserted: result.inserted,
    updated: result.updated,
    deactivated: result.deactivated,
    parentLinked: result.parentLinked,
  };
};
