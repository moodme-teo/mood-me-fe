// 게스트 세션 발급 서비스 함수. `guest_sessions` row를 생성한다 (#42 스키마).
// #34의 save-session.ts에 있던 임시 upsert를 대체하는 정식 발급 경로.
// 발급된 id는 응답 본문이 아니라 httpOnly 쿠키로만 나간다 (#126, guest-cookie.ts).

import "server-only";

import { createServiceClient } from "@/lib/supabase/service";

export type GuestSession = { id: string };

// 검증/서비스 함수 반환 형태 통일: { ok: true, value } | { ok: false, error } (docs/convention/type.md)
export async function createGuestSession(): Promise<
  { ok: true; value: GuestSession } | { ok: false; error: string }
> {
  const service = createServiceClient();

  const { data, error } = await service
    .from("guest_sessions")
    .insert({})
    .select("id")
    .single();

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, value: data as GuestSession };
}

// 이미 쿠키를 가진 브라우저가 다시 발급을 요청해도 같은 세션을 유지한다 — 발급 호출이
// 여러 화면(로그인·테스트)에서 일어나므로 멱등해야 한다. 쿠키가 가리키는 row가 사라졌으면
// (만료 정리 등) 새로 발급한다.
export async function resolveGuestSession(
  existingId: string | null,
): Promise<
  | { ok: true; value: GuestSession; isNew: boolean }
  | { ok: false; error: string }
> {
  if (existingId) {
    const service = createServiceClient();
    const { data, error } = await service
      .from("guest_sessions")
      .select("id")
      .eq("id", existingId)
      .maybeSingle();

    if (error) {
      return { ok: false, error: error.message };
    }
    if (data) {
      return { ok: true, value: data as GuestSession, isNew: false };
    }
  }

  const created = await createGuestSession();
  if (!created.ok) return created;

  return { ok: true, value: created.value, isNew: true };
}
