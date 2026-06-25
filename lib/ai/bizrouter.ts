import "server-only";

import { createOpenAI } from "@ai-sdk/openai";

const DEFAULT_BASE_URL = "https://api.bizrouter.ai/v1";
const DEFAULT_MODEL = "openai/gpt-5.1";

/** BizRouter OpenAI-compatible API 키 존재 여부 */
export const isBizRouterConfigured = (): boolean =>
  Boolean(process.env.BIZROUTER_API_KEY?.trim());

/** BizRouter 경유 Language Model 인스턴스 */
export const getBizRouterModel = () => {
  const apiKey = process.env.BIZROUTER_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("BIZROUTER_API_KEY is not configured");
  }

  const provider = createOpenAI({
    apiKey,
    baseURL: process.env.BIZROUTER_BASE_URL?.trim() || DEFAULT_BASE_URL,
  });

  return provider(process.env.AI_MODEL?.trim() || DEFAULT_MODEL);
};
