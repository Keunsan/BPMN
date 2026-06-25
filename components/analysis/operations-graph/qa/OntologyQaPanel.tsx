"use client";

import { Loader2, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { AiMarkdownContent } from "@/components/common/AiMarkdownContent";
import { EmptyState } from "@/components/common/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/error-handler";
import { useOntologyQa } from "@/lib/query/hooks/useOntologyQa";

const EXAMPLE_QUESTIONS = [
  "긴급수요관리에서 ERP를 쓰는 Task는?",
  "주간계획(MAIN) 변경이 수요 프로세스에 미치는 영향은?",
  "신규투입 취소 시 선행 프로세스와 병렬 Task는?",
] as const;

type OntologyQaPanelProps = {
  centerNodeId?: number | null;
};

/** 온톨로지 AI Q&A 패널 */
export const OntologyQaPanel = ({ centerNodeId }: OntologyQaPanelProps) => {
  const t = useTranslations("operationsGraph.qa");
  const [question, setQuestion] = useState("");
  const mutation = useOntologyQa();

  const handleAsk = (value?: string) => {
    const q = (value ?? question).trim();
    if (!q) {
      return;
    }
    mutation.mutate({
      question: q,
      centerNodeId: centerNodeId ?? undefined,
    });
  };

  const isAiUnavailable =
    mutation.isError &&
    mutation.error instanceof ApiError &&
    mutation.error.code === "E503";

  return (
    <section className="border-t border-border p-4">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="size-4 text-primary" aria-hidden />
        <h3 className="text-sm font-semibold">{t("title")}</h3>
      </div>

      <p className="mb-3 text-sm text-muted-foreground">{t("description")}</p>

      <div className="mb-3 flex flex-wrap gap-2">
        {EXAMPLE_QUESTIONS.map((sample) => (
          <Button
            key={sample}
            type="button"
            variant="outline"
            size="sm"
            className="h-auto whitespace-normal text-left text-sm"
            onClick={() => {
              setQuestion(sample);
              handleAsk(sample);
            }}
            disabled={mutation.isPending}
          >
            {sample}
          </Button>
        ))}
      </div>

      <textarea
        value={question}
        onChange={(event) => setQuestion(event.target.value)}
        placeholder={t("placeholder")}
        rows={3}
        className="mb-3 w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm"
      />

      <Button
        type="button"
        size="sm"
        onClick={() => handleAsk()}
        disabled={mutation.isPending || !question.trim()}
      >
        {mutation.isPending ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden />
            {t("asking")}
          </>
        ) : (
          t("ask")
        )}
      </Button>

      {isAiUnavailable ? (
        <div className="mt-4">
          <EmptyState
            title={t("notConfiguredTitle")}
            description={t("notConfiguredDescription")}
            className="py-6"
          />
        </div>
      ) : null}

      {mutation.isError && !isAiUnavailable ? (
        <p className="mt-3 text-sm text-destructive">{mutation.error.message}</p>
      ) : null}

      {mutation.data ? (
        <div className="mt-4 overflow-hidden rounded-lg border border-border bg-background">
          <div className="border-b border-border bg-muted/40 px-4 py-2">
            <p className="text-sm font-medium">{t("answerLabel")}</p>
          </div>

          <div className="px-4 py-3">
            <AiMarkdownContent content={mutation.data.answer} />
          </div>

          {mutation.data.citations.length > 0 ? (
            <div className="border-t border-border bg-muted/20 px-4 py-3">
              <p className="mb-2 text-sm font-medium text-muted-foreground">
                {t("citations")}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {mutation.data.citations.map((item) => (
                  <Badge key={item.code} variant="outline" className="h-auto py-0.5 font-mono">
                    {item.code}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
};
