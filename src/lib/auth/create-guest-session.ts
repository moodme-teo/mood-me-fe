// 게스트 세션 발급 서비스 함수. `guest_sessions` row를 생성한다 (#42 스키마).
// #34의 save-session.ts에 있던 임시 upsert를 대체하는 정식 발급 경로.

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
