/** HR ERP hr_erp_004 부서 정보 원본 */
export interface HrDepartment {
  parentDeptCode: string;
  deptCode: string;
  deptName: string;
  level: number;
  seq: number;
  endDeptYn: string;
  leaderEmployeeId: string | null;
  leaderName: string | null;
  costCode: string;
  costName: string;
  bizUnitCode: string;
  bizUnitName: string;
  buCd: string;
}

export interface HrDepartmentListResponse {
  count: number;
  data: HrDepartment[];
}
