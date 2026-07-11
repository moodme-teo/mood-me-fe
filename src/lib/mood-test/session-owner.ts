// 테스트 세션 소유자 확인. sessionId는 클라이언트가 crypto.randomUUID()로 만들어 주장하는
// 값이라(HomeExperience), 서버는 매 요청마다 "이 세션이 요청자 것인가"를 직접 확인해야 한다 (#126).

import "server-only";

import type { Requester } from "@/lib/auth/requester";
import { isOwnerOf } from "@/lib/auth/requester";
import { createServiceClient } from "@/lib/supabase/service";

// 소유자 확인만 하는 최소 조회 — journey는 읽지 않는다.
export async function isMoodTestSessionOwner(
  sessionId: string,
  requester: Requester,
): Promise<boolean> {
  if (requester.kind === "anonymous") return false;

  const service = createServiceClient();
  const { data, error } = await service
    .from("mood_test_sessions")
    .select("user_id, guest_session_id")
    .eq("id", sessionId)
    .maybeSingle();

  if (error || !data) return false;

  return isOwnerOf(
    requester,
    data as { user_id: string | null; guest_session_id: string | null },
  );
}
