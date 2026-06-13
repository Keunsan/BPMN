import type { ProcessNodeDto } from "@/types/process";
import {
  getProcessScopeLabel,
  isEnterpriseScope,
} from "@/lib/utils/process-scope";

/** 프로세스 범위(법인·사업부) 라벨 */
export const formatProcessScope = (process: ProcessNodeDto): string => {
  const label = getProcessScopeLabel(process);
  if (label) {
    return label;
  }
  if (isEnterpriseScope(process.companyCode, process.businessUnitCode)) {
    return "";
  }
  return [
    process.companyName ?? process.companyCode,
    process.businessUnitName ?? process.businessUnitCode,
  ]
    .filter(Boolean)
    .join(" · ");
};

/** 트리·목록에서 사용하는 프로세스 표시명 */
export const formatProcessLabel = (process: ProcessNodeDto): string => {
  const scope = formatProcessScope(process);
  const base = process.displayName ?? process.name;
  if (!scope) {
    return base;
  }
  if (!process.isStandard || process.variantOf) {
    return `${base} · ${scope}`;
  }
  return base;
};
