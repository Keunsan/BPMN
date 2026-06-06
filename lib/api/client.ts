import type { Locale } from "@/lib/i18n/config";

import type { ApiErrorResponse, ApiResponse } from "@/types/error";



import { ApiError } from "./error-handler";



const DEFAULT_TIMEOUT_MS = 30_000;



export type ApiClientOptions = RequestInit & {

  locale?: Locale;

  timeout?: number;

  params?: Record<string, string | number | boolean | undefined | null>;

};



type ApiClientGetLocale = () => Locale;



let getLocale: ApiClientGetLocale = () => "ko";



/** API 클라이언트에서 사용할 locale getter 등록 */

export function setApiClientLocale(getter: ApiClientGetLocale): void {

  getLocale = getter;

}



function buildUrl(

  path: string,

  params?: ApiClientOptions["params"],

): string {

  const url = path.startsWith("/") ? path : `/${path}`;



  if (!params) {

    return url;

  }



  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {

    if (value !== undefined && value !== null && value !== "") {

      search.set(key, String(value));

    }

  }



  const query = search.toString();

  if (!query) {

    return url;

  }



  const separator = url.includes("?") ? "&" : "?";

  return `${url}${separator}${query}`;

}



function redirectToLogin(locale: Locale): void {

  if (typeof window === "undefined") {

    return;

  }

  window.location.href = `/${locale}/login`;

}



/** API 응답 JSON 파싱 */

const parseResponseBody = <T>(

  rawText: string,

  status: number,

): ApiResponse<T> | ApiErrorResponse => {

  if (!rawText.trim()) {

    throw new ApiError(

      "E502",

      "서버 응답을 처리할 수 없습니다.",

      status || 502,

    );

  }



  try {

    return JSON.parse(rawText) as ApiResponse<T> | ApiErrorResponse;

  } catch {

    throw new ApiError(

      "E502",

      "서버 응답을 처리할 수 없습니다.",

      status || 502,

    );

  }

};



/** 공통 fetch 래퍼 — PRD 9.1 */

export async function apiClient<T>(

  path: string,

  options: ApiClientOptions = {},

): Promise<T> {

  const {

    locale = getLocale(),

    timeout = DEFAULT_TIMEOUT_MS,

    params,

    headers,

    ...init

  } = options;



  const controller = new AbortController();

  const timer = setTimeout(() => controller.abort(), timeout);



  try {

    const response = await fetch(buildUrl(path, params), {

      ...init,

      headers: {

        Accept: "application/json",

        "Content-Type": "application/json",

        "Accept-Language": locale,

        ...headers,

      },

      signal: controller.signal,

    });



    if (response.status === 401) {

      redirectToLogin(locale);

      throw new ApiError("E101", "Authentication required", 401);

    }



    const rawText = await response.text();

    const body = parseResponseBody<T>(rawText, response.status);



    if (!body.success) {

      if (!body.error?.code) {

        throw new ApiError(

          "E502",

          "서버 오류가 발생했습니다.",

          response.status || 500,

        );

      }

      throw new ApiError(

        body.error.code,

        body.error.message,

        response.status,

        body.error.details,

        body.error.field,

        body.error.traceId,

      );

    }



    return body.data;

  } catch (error) {

    if (error instanceof ApiError) {

      throw error;

    }



    if (error instanceof DOMException && error.name === "AbortError") {

      throw new ApiError("E503", "Request timeout", 503);

    }



    throw new ApiError(

      "E501",

      error instanceof Error ? error.message : "Network error",

      500,

    );

  } finally {

    clearTimeout(timer);

  }

}



/** GET 요청 헬퍼 */

export function apiGet<T>(

  path: string,

  options?: Omit<ApiClientOptions, "method" | "body">,

): Promise<T> {

  return apiClient<T>(path, { ...options, method: "GET" });

}



/** POST 요청 헬퍼 */

export function apiPost<T>(

  path: string,

  data?: unknown,

  options?: Omit<ApiClientOptions, "method" | "body">,

): Promise<T> {

  return apiClient<T>(path, {

    ...options,

    method: "POST",

    body: data !== undefined ? JSON.stringify(data) : undefined,

  });

}



/** PUT 요청 헬퍼 */

export function apiPut<T>(

  path: string,

  data?: unknown,

  options?: Omit<ApiClientOptions, "method" | "body">,

): Promise<T> {

  return apiClient<T>(path, {

    ...options,

    method: "PUT",

    body: data !== undefined ? JSON.stringify(data) : undefined,

  });

}



/** DELETE 요청 헬퍼 */

export function apiDelete<T>(

  path: string,

  options?: Omit<ApiClientOptions, "method" | "body">,

): Promise<T> {

  return apiClient<T>(path, { ...options, method: "DELETE" });

}


