// 게스트 → 회원 소유권 이전. 게스트로 만든 테스트 세션·무드보드를 로그인한 계정으로 옮긴다.
//
// 이전이 없으면 소유자 검증(#126)이 정상 사용자를 막는다 — 게스트로 테스트를 마치고 결과를
// 기다리다 로그인하면, 서버는 요청자를 회원으로 보고 게스트 소유 세션을 "남의 것"으로 판정한다.
//
// 게스트 id는 호출자(클라이언트)가 넘기지 않는다. 넘기게 두면 남의 게스트 id를 실어
// 그 사람의 보드를 자기 계정으로 가져올 수 있다 — 서버가 쿠키에서만 읽는다.

import "server-only";

import { createServiceClient } from "@/lib/supabase/service";

// mood_test_sessions·moodboards 모두 (user_id ⊕ guest_session_id) 모양이라 같은 방식으로 옮긴다.
const OWNED_TABLES = ["mood_test_sessions", "moodboards"] as const;

export async function claimGuestData(
  userId: string,
  guestSessionId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const service = createServiceClient();

  for (const table of OWNED_TABLES) {
    const { error } = await service
      .from(table)
      .update({ user_id: userId, guest_session_id: null })
      .eq("guest_session_id", guestSessionId);

    if (error) {
      return { ok: false, error: error.message };
    }
  }

  return { ok: true };
}
