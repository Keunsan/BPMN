import { NextResponse } from "next/server";

import { testConnection } from "@/lib/db";

/** DB 연결 상태 확인 (개발/운영 헬스체크용) */
export async function GET() {
  try {
    const result = await testConnection();
    return NextResponse.json({
      success: true,
      data: {
        connected: true,
        version: result.version.split("\n")[0],
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown database error";

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "E502",
          message,
        },
      },
      { status: 503 },
    );
  }
}
