// 클라이언트 게스트 세션 유틸. 신원은 서버가 httpOnly 쿠키로 들고 있으므로 클라이언트는
// id 값을 알지 못하고, 알 필요도 없다 — "세션이 있는 상태"만 보장해두면 브라우저가 이후
// 동일 출처 요청에 쿠키를 자동으로 실어 보낸다 (#126).
//
// 이전에는 localStorage에 id를 두고 요청 본문·쿼리스트링으로 넘겼는데, 그 값을 아는 사람이
// 곧 주인이 되는 구조라 남의 세션·보드를 사칭할 수 있었다.

import { apiClient } from "@/lib/api-client";

// 서버에서 멱등하게 처리된다 — 쿠키가 이미 있으면 그 세션을 유지한다.
export async function ensureGuestSession(): Promise<void> {
  await apiClient.post("/api/guest-sessions");
}
