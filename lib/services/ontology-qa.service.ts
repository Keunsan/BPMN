import "server-only";

import { generateText } from "ai";

import { ApiError } from "@/lib/api/error-handler";
import { getBizRouterModel, isBizRouterConfigured } from "@/lib/ai/bizrouter";
import { buildPocOntologyContext } from "@/lib/services/ontology-export.service";
import type { OntologyCitation, OntologyQaResult } from "@/types/ontology";

const SYSTEM_PROMPT = `당신은 PAMS 프로세스 온톨로지 어시스턴트입니다.
아래 제공된 ontology context(프로세스, 관계 triple, 용어집)만 근거로 답변하세요.
- context에 없는 내용은 추측하지 말고 "제공된 context에서 확인할 수 없습니다"라고 답하세요.
- 답변에 관련 프로세스/Task 코드(STP-...)를 반드시 인용하세요.
- 한국어로 간결하게 답변하세요.
- 답변은 반드시 마크다운으로 작성하세요.
- 시스템·테이블·Task 등 목록형 정보는 마크다운 테이블(| 열 |)로 정리하고, 헤더·구분선·각 행을 반드시 줄바꿈으로 구분하세요.
- 프로세스 흐름·선후행 관계는 ### 소제목과 불릿 목록(-)으로 구분해 설명하세요.
- 한 문단은 2~3문장 이내로 짧게 유지하세요.`;

const extractCitations = (
  answer: string,
  knownCodes: string[],
): OntologyCitation[] => {
  const found = new Set<string>();
  for (const code of knownCodes) {
    if (answer.includes(code)) {
      found.add(code);
    }
  }

  return [...found].map((code) => ({
    code,
    name: code,
    kind: code.includes("-") && code.split("-").length > 4 ? "Task" : "L3",
    uri: `https://pams.local/ontology/process/${encodeURIComponent(code)}`,
  }));
};

export type OntologyQaInput = {
  question: string;
  locale?: string;
};

/** POC scope ontology-aware Q&A */
export const askOntologyQuestion = async (
  input: OntologyQaInput,
): Promise<OntologyQaResult> => {
  const question = input.question.trim();
  if (!question) {
    throw new ApiError("E001", "question is required", 400, undefined, "question");
  }

  if (!isBizRouterConfigured()) {
    throw new ApiError(
      "E503",
      "AI service is not configured. Set BIZROUTER_API_KEY in .env.local",
      503,
    );
  }

  const context = await buildPocOntologyContext(2);
  const knownCodes = context.individuals
    .map((item) => item.code)
    .filter((code): code is string => Boolean(code));

  const userPrompt = `## Ontology Context\n${context.contextText}\n\n## Question\n${question}`;

  const { text } = await generateText({
    model: getBizRouterModel(),
    system: SYSTEM_PROMPT,
    prompt: userPrompt,
  });

  return {
    answer: text,
    citations: extractCitations(text, knownCodes),
  };
};
