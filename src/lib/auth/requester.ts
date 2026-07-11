// 요청자 신원. 회원은 인증 쿠키(Supabase), 게스트는 게스트 쿠키에서만 읽는다 —
// 요청 본문의 자칭 값은 보지 않는다 (#126). 소유자 검증은 전부 이 타입을 기준으로 한다.

import "server-only";

import { readGuestSessionId } from "@/lib/auth/guest-cookie";
import { createClient } from "@/lib/supabase/server";

export type Requester =
  | { kind: "user"; userId: string }
  | { kind: "guest"; guestSessionId: string }
  | { kind: "anonymous" };

// 소유자 컬럼 쌍. mood_test_sessions는 XOR 제약(user_id ⊕ guest_session_id)이 걸려 있고
// moodboards도 같은 모양을 따른다.
export type OwnerColumns = {
  user_id: string | null;
  guest_session_id: string | null;
};

function canUseSupabaseAuth() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export async function getRequester(): Promise<Requester> {
  if (canUseSupabaseAuth()) {
    const authClient = await createClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();
    if (user) return { kind: "user", userId: user.id };
  }

  const guestSessionId = await readGuestSessionId();
  if (guestSessionId) return { kind: "guest", guestSessionId };

  return { kind: "anonymous" };
}

// 신규 row에 심을 소유자. anonymous는 소유자가 될 수 없다 — 호출 전에 걸러야 한다.
export function ownerColumnsOf(
  requester: Exclude<Requester, { kind: "anonymous" }>,
): OwnerColumns {
  return requester.kind === "user"
    ? { user_id: requester.userId, guest_session_id: null }
    : { user_id: null, guest_session_id: requester.guestSessionId };
}

// 소유자가 비어 있는 row(#134 이전에 만들어진 무드보드)는 누구의 것도 아니다 — false.
export function isOwnerOf(requester: Requester, owner: OwnerColumns): boolean {
  if (requester.kind === "user") {
    return owner.user_id !== null && owner.user_id === requester.userId;
  }
  if (requester.kind === "guest") {
    return (
      owner.guest_session_id !== null &&
      owner.guest_session_id === requester.guestSessionId
    );
  }
  return false;
}
