// 게스트 신원 쿠키. guest_session_id는 "값을 아는 사람이 곧 주인"인 열쇠라 JS가 읽지
// 못하게 httpOnly로 두고, 요청 본문·쿼리스트링으로는 절대 받지 않는다 (#126).
// 브라우저가 동일 출처 요청에 자동으로 실어 보내므로 클라이언트는 값을 알 필요가 없다.

import "server-only";

import { cookies } from "next/headers";

export const GUEST_SESSION_COOKIE = "mood-me-guest-session";

// maxAge는 guest_sessions.expires_at 기본값(30일)과 맞춘다. 만료 정책이 확정되면
// 두 곳을 함께 옮긴다 (PRD 13-1, core_pipeline_schema.sql).
const GUEST_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge: GUEST_SESSION_MAX_AGE_SECONDS,
} as const;

export async function readGuestSessionId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(GUEST_SESSION_COOKIE)?.value ?? null;
}

// cookies().set은 Route Handler / 서버 함수에서만 동작한다 (Next 16 — 서버 컴포넌트
// 렌더 중에는 응답 헤더를 못 건드린다). 그래서 발급은 POST /api/guest-sessions 한 곳에서만.
export async function setGuestSessionCookie(guestSessionId: string) {
  const cookieStore = await cookies();
  cookieStore.set(GUEST_SESSION_COOKIE, guestSessionId, COOKIE_OPTIONS);
}

export async function clearGuestSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(GUEST_SESSION_COOKIE);
}
