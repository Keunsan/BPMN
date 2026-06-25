"use client";

import { useMutation } from "@tanstack/react-query";

import { apiPost } from "@/lib/api/client";
import { analysisKeys } from "@/lib/query/keys";
import type { OntologyQaResult } from "@/types/ontology";

type OntologyQaRequest = {
  question: string;
  centerNodeId?: number;
  locale?: string;
};

const postOntologyQa = async (
  payload: OntologyQaRequest,
): Promise<OntologyQaResult> =>
  apiPost<OntologyQaResult>("/api/analysis/ontology-qa", payload);

/** 온톨로지 AI Q&A mutation */
export const useOntologyQa = () =>
  useMutation({
    mutationKey: analysisKeys.ontologyQa({ scope: "poc" }),
    mutationFn: postOntologyQa,
  });
