/** POC 용어집 스텁 — SKOS Concept Scheme 투영 */

import type { GlossaryTermDto } from "@/types/ontology";

export const POC_GLOSSARY_TERMS: GlossaryTermDto[] = [
  {
    id: "ap2-shipment-plan",
    prefLabel: "AP2 출하계획",
    altLabels: ["AP2", "출하계획", "AP2 출하계획등록"],
    definition: "SCM 시스템에서 수요·출하 계획을 등록·확정하는 업무 영역",
    relatedCodes: [
      "STP-01-01-01-V-WIQ-QT",
      "STP-01-01-01-03-V-WIQ-QT",
      "STP-01-01-01-06-V-WIQ-QT",
    ],
  },
  {
    id: "weekly-supply-demand",
    prefLabel: "주간 공급계획 수요",
    altLabels: ["주간 공급계획", "WSCM 수요"],
    definition: "주간 공급계획 기준으로 생성·조정되는 수요 정보",
    relatedCodes: [
      "STP-01-01-01-04-V-WIQ-QT",
      "STP-01-01-01-05-V-WIQ-QT",
      "STP-01-01-01-08-V-WIQ-QT",
    ],
  },
  {
    id: "sop-meeting",
    prefLabel: "S&OP 미팅",
    altLabels: ["S&OP", "Sales and Operations Planning"],
    definition: "영업·생산·구매 간 긴급 수요 협의 회의",
    relatedCodes: ["STP-01-01-02", "STP-01-01-02-02"],
  },
  {
    id: "daily-urgent-demand",
    prefLabel: "일일 긴급 수요",
    altLabels: ["일일긴급수요", "긴급 수요 등록"],
    definition: "SCM에서 일일 단위로 등록·승인하는 긴급 수요",
    relatedCodes: ["STP-01-01-02-03", "STP-01-01-02-04"],
  },
  {
    id: "manufacturing-order",
    prefLabel: "제조오더",
    altLabels: ["작업지시서", "제조 오더", "MO"],
    definition: "ERP에서 생성·관리하는 생산 지시 정보",
    relatedCodes: [
      "STP-01-01-02-05",
      "STP-01-01-02-06",
      "STP-01-01-03-02",
    ],
  },
  {
    id: "urgent-purchase",
    prefLabel: "긴급 발주",
    altLabels: ["긴급 발주진행", "긴급발주"],
    definition: "SRM을 통한 긴급 자재 발주 처리",
    relatedCodes: ["STP-01-01-02-07"],
  },
  {
    id: "new-input-cancel",
    prefLabel: "신규투입 취소",
    altLabels: ["신규 투입 취소", "투입 취소", "제품투입 취소"],
    definition: "주간 계획 대비 신규 투입 또는 취소 요청·반영 업무",
    relatedCodes: [
      "STP-01-01-03",
      "STP-01-01-03-01",
      "STP-01-01-03-02",
      "STP-01-01-03-03",
    ],
  },
  {
    id: "weekly-main-plan",
    prefLabel: "주간계획(MAIN)",
    altLabels: ["주간 MAIN", "Material MAIN", "주간계획 MAIN"],
    definition: "생산 주간 MAIN 계획 확정 — 수요·취소 프로세스의 트리거",
    relatedCodes: ["STP-04-01-02"],
  },
  {
    id: "customer-po",
    prefLabel: "고객사 PO",
    altLabels: ["Purchase Order", "고객 PO"],
    definition: "고객사가 발행하는 구매오더",
    relatedCodes: [
      "STP-01-01-01-01-V-WIQ-QT",
      "STP-01-01-02-01",
    ],
  },
  {
    id: "demand-management",
    prefLabel: "수요관리",
    altLabels: ["Demand Management"],
    definition: "영업 수요 등록·조정·확정 전반 프로세스",
    relatedCodes: ["STP-01-01-01-V-WIQ-QT", "STP-01-01-01"],
  },
  {
    id: "urgent-demand-mgmt",
    prefLabel: "긴급수요관리",
    altLabels: ["긴급 수요 관리", "Urgent Demand"],
    definition: "긴급 PO부터 발주까지의 단기 수요 대응 프로세스",
    relatedCodes: ["STP-01-01-02"],
  },
  {
    id: "ap2-cutoff",
    prefLabel: "AP2 CUT-OFF",
    altLabels: ["AP2 컷오프", "출하계획 CUT-OFF"],
    definition: "AP2 출하계획 마감·확정 시점 업무",
    relatedCodes: ["STP-01-01-01-07-V-WIQ-QT"],
  },
  {
    id: "po-cancel-link",
    prefLabel: "발주 취소 연계",
    altLabels: ["발주 취소 요청 정보 연계"],
    definition: "신규투입 취소 후 구매 발주 취소 정보를 연계하는 Task",
    relatedCodes: ["STP-01-01-03-03"],
  },
  {
    id: "variant-wiq-qt",
    prefLabel: "WIQ/QT 수요관리 변형",
    altLabels: ["쿼츠 수요관리", "한국법인 수요관리 변형"],
    definition: "전사 표준 수요관리의 WIQ·QT 법인·사업부 변형",
    relatedCodes: ["STP-01-01-01-V-WIQ-QT"],
  },
  {
    id: "open-order-balance",
    prefLabel: "수주잔량",
    altLabels: ["현 수주잔량", "고객사 가용재고"],
    definition: "수요 검토 시 참조하는 수주·재고 정보",
    relatedCodes: ["STP-01-01-01-02-V-WIQ-QT"],
  },
];

export const findGlossaryByCode = (code: string): GlossaryTermDto[] =>
  POC_GLOSSARY_TERMS.filter((term) => term.relatedCodes.includes(code));

export const findGlossaryByQuery = (query: string): GlossaryTermDto[] => {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return [];
  }
  return POC_GLOSSARY_TERMS.filter(
    (term) =>
      term.prefLabel.toLowerCase().includes(normalized) ||
      term.altLabels.some((label) => label.toLowerCase().includes(normalized)) ||
      term.definition.toLowerCase().includes(normalized),
  );
};
