import "server-only";

import { ApiError } from "@/lib/api/error-handler";
import type { HrDepartment, HrDepartmentListResponse } from "@/types/hr-erp";

const REQUEST_TIMEOUT_MS = 15_000;

type HrDepartmentRaw = {
  P_DEPT_CD?: string;
  DEPT_CD?: string;
  DEPT_NM?: string;
  LVL?: number | string;
  SEQ?: number | string;
  END_DEPT_YN?: string;
  LEADER?: string | null;
  LEADER_NM?: string | null;
  COST_CD?: string;
  COST_NM?: string;
  BIZ_UNIT_CD?: string;
  BIZ_UNIT_NM?: string;
  BU_CD?: string;
};

type HrApiResponse = {
  count?: number;
  data?: HrDepartmentRaw[];
};

const trimOrEmpty = (value: string | null | undefined): string =>
  (value ?? "").trim();

const trimOrNull = (value: string | null | undefined): string | null => {
  const trimmed = (value ?? "").trim();
  return trimmed.length > 0 ? trimmed : null;
};

const mapHrDepartment = (row: HrDepartmentRaw): HrDepartment | null => {
  const deptCode = trimOrEmpty(row.DEPT_CD);
  const deptName = trimOrEmpty(row.DEPT_NM);

  if (!deptCode || !deptName) {
    return null;
  }

  return {
    parentDeptCode: trimOrEmpty(row.P_DEPT_CD),
    deptCode,
    deptName,
    level: Number(row.LVL ?? 0),
    seq: Number(row.SEQ ?? 0),
    endDeptYn: trimOrEmpty(row.END_DEPT_YN) || "N",
    leaderEmployeeId: trimOrNull(row.LEADER),
    leaderName: trimOrNull(row.LEADER_NM),
    costCode: trimOrEmpty(row.COST_CD),
    costName: trimOrEmpty(row.COST_NM),
    bizUnitCode: trimOrEmpty(row.BIZ_UNIT_CD),
    bizUnitName: trimOrEmpty(row.BIZ_UNIT_NM),
    buCd: trimOrEmpty(row.BU_CD),
  };
};

const getHrApiConfig = (): { url: string; apiKey: string } => {
  const url = process.env.HR_ERP_DEPT_API_URL?.trim();
  const apiKey = process.env.HR_ERP_GRAVITEE_API_KEY?.trim();

  if (!url || !apiKey) {
    throw new ApiError(
      "E601",
      "HR ERP department API is not configured",
      502,
    );
  }

  return { url, apiKey };
};

/** HR ERP 부서 목록을 조회한다. */
export const fetchHrDepartments = async (): Promise<HrDepartmentListResponse> => {
  const { url, apiKey } = getHrApiConfig();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "X-Gravitee-Api-Key": apiKey,
      },
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      throw new ApiError(
        "E601",
        `HR ERP API failed: ${response.status}`,
        502,
      );
    }

    const payload = (await response.json()) as HrApiResponse;
    const data = (payload.data ?? [])
      .map(mapHrDepartment)
      .filter((item): item is HrDepartment => item !== null);

    return {
      count: payload.count ?? data.length,
      data,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(
      "E601",
      error instanceof Error ? error.message : "HR ERP API failed",
      502,
    );
  } finally {
    clearTimeout(timer);
  }
};
