import type { NextRequest } from "next/server";

import { NextResponse } from "next/server";



import { requireAuth } from "@/lib/api/auth";

import {

  ApiError,

  createErrorResponse,

  generateTraceId,

  logApiError,

  toApiError,

} from "@/lib/api/response";

import { fetchErrorFromDb } from "@/lib/api/response";

import { getLocaleFromRequest } from "@/lib/api/locale";

import type { Locale } from "@/lib/i18n/config";

import type { ApiErrorResponse } from "@/types/error";



type RouteContext = {

  params: Promise<Record<string, string>>;

};



type ApiHandlerContext = {

  locale: Locale;

  traceId: string;

  request: NextRequest;

  params: Record<string, string>;

};



type ApiHandler = (

  ctx: ApiHandlerContext,

) => Promise<NextResponse | { data: unknown; status?: number; meta?: Record<string, unknown> }>;



type WithApiHandlerOptions = {

  requireAuthentication?: boolean;

};



/**

 * API Route 공통 래퍼 — 에러 처리·locale·traceId 통합

 */

export const withApiHandler = (

  handler: ApiHandler,

  options: WithApiHandlerOptions = {},

) => {

  return async (

    request: NextRequest,

    context?: RouteContext,

  ): Promise<NextResponse> => {

    const traceId = generateTraceId();

    const locale = getLocaleFromRequest(request);

    const params = context?.params ? await context.params : {};



    try {

      if (options.requireAuthentication) {

        await requireAuth();

      }



      const result = await handler({ locale, traceId, request, params });



      if (result instanceof NextResponse) {

        return result;

      }



      return NextResponse.json(

        {

          success: true,

          data: result.data,

          ...(result.meta ? { meta: result.meta } : {}),

        },

        { status: result.status ?? 200 },

      );

    } catch (error) {

      logApiError(traceId, error);



      const apiError =

        error instanceof ApiError

          ? error

          : toApiError(error, traceId);



      if (!apiError.traceId) {

        apiError.traceId = traceId;

      }



      let body: ApiErrorResponse;

      try {

        body = await createErrorResponse(

          apiError,

          locale,

          fetchErrorFromDb,

        );

      } catch {

        body = {

          success: false,

          error: {

            code: apiError.code,

            message: apiError.message,

            details: apiError.details,

            field: apiError.field,

            timestamp: new Date().toISOString(),

            traceId: apiError.traceId,

          },

        };

      }



      if (process.env.NODE_ENV === "development") {

        console.error(`[API ${traceId}]`, body.error);

      }



      return NextResponse.json(body, { status: apiError.status });

    }

  };

};


