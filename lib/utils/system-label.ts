import type { ApplicationSystemDto } from "@/types/system";

/** 시스템명에 법인/사업부 범위를 붙여 중복 시스템을 구분한다. */
export const formatSystemScope = (system: ApplicationSystemDto): string => {
  const scope = [
    system.companyName ?? system.companyCode,
    system.businessUnitName ?? system.businessUnitCode,
  ].filter(Boolean);

  return scope.join(" · ");
};

/** 화면 선택 목록에서 사용하는 시스템 표시명이다. */
export const formatSystemLabel = (system: ApplicationSystemDto): string => {
  const scope = formatSystemScope(system);
  return scope ? `${system.systemName} · ${scope}` : system.systemName;
};
