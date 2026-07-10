// 무드보드 소유자 확인. 보드 **조회**는 공개다(PRD §10.1 — 공유 링크) — 소유 여부는 편집
// 진입 가능 여부를 가르는 데만 쓴다.
//
// 소유자 식별값(user_id·guest_session_id)은 절대 응답에 담지 않는다. 게스트 id는 그 자체가
// 열쇠라, 공개된 공유 응답에 실으면 링크를 연 누구나 소유자로 위장할 수 있다 (#126).

import "server-only";

import type { Requester } from "@/lib/auth/requester";
import { isOwnerOf } from "@/lib/auth/requester";
import { createServiceClient } from "@/lib/supabase/service";

export type MoodboardOwnerCheck =
  | { ok: true; isOwner: boolean }
  | { ok: false; code: "OWNER_CHECK_UNAVAILABLE"; error: string };

function canUseSupabaseService() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SECRET_KEY,
  );
}

function canUseE2EMockOwner() {
  return process.env.MOOD_ME_E2E_MOCK_OWNER === "1";
}

function isE2EMockMoodboardOwner(moodboardId: string, requester: Requester) {
  return (
    moodboardId === "33333333-3333-4333-8333-333333333333" &&
    requester.kind === "guest" &&
    requester.guestSessionId === "11111111-1111-4111-8111-111111111111"
  );
}

export async function checkMoodboardOwner(
  moodboardId: string,
  requester: Requester,
): Promise<MoodboardOwnerCheck> {
  if (requester.kind === "anonymous") return { ok: true, isOwner: false };

  if (!canUseSupabaseService()) {
    if (canUseE2EMockOwner()) {
      return {
        ok: true,
        isOwner: isE2EMockMoodboardOwner(moodboardId, requester),
      };
    }

    return {
      ok: false,
      code: "OWNER_CHECK_UNAVAILABLE",
      error: "무드보드 소유자 검증을 할 수 없어요.",
    };
  }

  const service = createServiceClient();
  const { data, error } = await service
    .from("moodboards")
    .select("user_id, guest_session_id")
    .eq("id", moodboardId)
    .maybeSingle();

  if (error) {
    console.error("[moodboards] owner check 실패", error);
    return {
      ok: false,
      code: "OWNER_CHECK_UNAVAILABLE",
      error: "무드보드 소유자 검증을 할 수 없어요.",
    };
  }
  if (!data) return { ok: true, isOwner: false };

  return {
    ok: true,
    isOwner: isOwnerOf(
      requester,
      data as { user_id: string | null; guest_session_id: string | null },
    ),
  };
}

export async function isMoodboardOwner(
  moodboardId: string,
  requester: Requester,
): Promise<boolean> {
  const result = await checkMoodboardOwner(moodboardId, requester);
  return result.ok ? result.isOwner : false;
}
