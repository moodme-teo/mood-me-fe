// 무드보드 소유자 확인. 보드 **조회**는 공개다(PRD §10.1 — 공유 링크) — 소유 여부는 편집
// 진입 가능 여부를 가르는 데만 쓴다.
//
// 소유자 식별값(user_id·guest_session_id)은 절대 응답에 담지 않는다. 게스트 id는 그 자체가
// 열쇠라, 공개된 공유 응답에 실으면 링크를 연 누구나 소유자로 위장할 수 있다 (#126).

import "server-only";

import type { Requester } from "@/lib/auth/requester";
import { isOwnerOf } from "@/lib/auth/requester";
import { createServiceClient } from "@/lib/supabase/service";

export async function isMoodboardOwner(
  moodboardId: string,
  requester: Requester,
): Promise<boolean> {
  if (requester.kind === "anonymous") return false;

  const service = createServiceClient();
  const { data, error } = await service
    .from("moodboards")
    .select("user_id, guest_session_id")
    .eq("id", moodboardId)
    .maybeSingle();

  if (error || !data) return false;

  return isOwnerOf(
    requester,
    data as { user_id: string | null; guest_session_id: string | null },
  );
}
