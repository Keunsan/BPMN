import { ApiError } from "@/lib/api/error-handler";
import { withApiHandler } from "@/lib/api/route-handler";
import { askOntologyQuestion } from "@/lib/services/ontology-qa.service";

type OntologyQaBody = {
  question?: string;
  centerNodeId?: number;
  locale?: string;
};

/** POST /api/analysis/ontology-qa — 온톨로지 RAG Q&A */
export const POST = withApiHandler(async ({ request }) => {
  let body: OntologyQaBody;
  try {
    body = (await request.json()) as OntologyQaBody;
  } catch {
    throw new ApiError("E001", "Invalid JSON body", 400);
  }

  const question = body.question?.trim();
  if (!question) {
    throw new ApiError("E001", "question is required", 400, undefined, "question");
  }

  const data = await askOntologyQuestion({
    question,
    locale: body.locale,
  });

  return { data };
});
