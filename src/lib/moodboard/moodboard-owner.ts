// 무드보드 소유자 확인. 보드 **조회**는 공개다(PRD §10.1 — 공유 링크) — 소유 여부는 편집
// 진입 가능 여부를 가르는 데만 쓴다.
//
// 소유자 식별값(user_id·guest_session_id)은 절대 응답에 담지 않는다. 게스트 id는 그 자체가
// 열쇠라, 공개된 공유 응답에 실으면 링크를 연 누구나 소유자로 위장할 수 있다 (#126).

import "server-only";

import type { Requester } from "@/lib/auth/requester";
import { isOwnerOf } from "@/lib/auth/requester";
import { createServiceClient } from "@/lib/supabase/service";

// exists: 이 moodboardId로 이미 저장된 row가 있는지. 아직 없는 신규 보드는 소유자
// 자체가 없으므로 isOwner:false와 구분해야 한다 — export-upload-url(#163)이
// "최초 저장(insert) 전에는 아무나 업로드 URL을 받을 수 있어야 한다"를 판단하는 데 쓴다.
export type MoodboardOwnerCheck =
  | { ok: true; isOwner: boolean; exists: boolean }
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
  // 존재 여부를 조회하지 않은 채 돌려주는 값이라 exists는 임의값이다 — 호출부는
  // 어차피 anonymous를 이 결과와 무관하게 먼저 걸러낸다.
  if (requester.kind === "anonymous")
    return { ok: true, isOwner: false, exists: false };

  if (!canUseSupabaseService()) {
    if (canUseE2EMockOwner()) {
      return {
        ok: true,
        isOwner: isE2EMockMoodboardOwner(moodboardId, requester),
        exists: true,
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
  if (!data) return { ok: true, isOwner: false, exists: false };

  return {
    ok: true,
    isOwner: isOwnerOf(
      requester,
      data as { user_id: string | null; guest_session_id: string | null },
    ),
    exists: true,
  };
}

export async function isMoodboardOwner(
  moodboardId: string,
  requester: Requester,
): Promise<boolean> {
  const result = await checkMoodboardOwner(moodboardId, requester);
  return result.ok ? result.isOwner : false;
}
