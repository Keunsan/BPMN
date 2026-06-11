import "server-only";

import { cookies } from "next/headers";

import {
  SESSION_COOKIE_NAME,
  SESSION_TIMEOUT_MS,
} from "@/lib/session/constants";

export type SessionPayload = {
  userId: number;
  userAccount: string;
  expiresAt: number;
};

const encodePayload = (payload: SessionPayload): string =>
  Buffer.from(JSON.stringify(payload)).toString("base64url");

const decodePayload = (value: string): SessionPayload | null => {
  try {
    const parsed: unknown = JSON.parse(
      Buffer.from(value, "base64url").toString("utf8"),
    );
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "userId" in parsed &&
      "userAccount" in parsed &&
      "expiresAt" in parsed &&
      typeof (parsed as SessionPayload).userId === "number" &&
      typeof (parsed as SessionPayload).userAccount === "string" &&
      typeof (parsed as SessionPayload).expiresAt === "number"
    ) {
      return parsed as SessionPayload;
    }
  } catch {
    return null;
  }
  return null;
};

/** 세션 쿠키를 읽는다 */
export const readSession = async (): Promise<SessionPayload | null> => {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!raw) {
    return null;
  }

  const payload = decodePayload(raw);
  if (!payload || payload.expiresAt <= Date.now()) {
    return null;
  }

  return payload;
};

/** 세션 쿠키를 저장한다 */
export const writeSession = async (payload: SessionPayload): Promise<void> => {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, encodePayload(payload), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(payload.expiresAt),
  });
};

/** 세션 쿠키를 삭제한다 */
export const clearSessionCookie = async (): Promise<void> => {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
};

/** 신규 세션 페이로드를 생성한다 */
export const createSessionPayload = (
  userId: number,
  userAccount: string,
): SessionPayload => ({
  userId,
  userAccount,
  expiresAt: Date.now() + SESSION_TIMEOUT_MS,
});

/** 세션 만료 시각을 연장한다 */
export const extendSessionPayload = (
  payload: SessionPayload,
): SessionPayload => ({
  ...payload,
  expiresAt: Date.now() + SESSION_TIMEOUT_MS,
});
