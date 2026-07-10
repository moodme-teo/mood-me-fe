import { apiError, apiSuccess } from "@/lib/api-response";
import { resolveGuestSession } from "@/lib/auth/create-guest-session";
import {
  readGuestSessionId,
  setGuestSessionCookie,
} from "@/lib/auth/guest-cookie";
import { getRequester } from "@/lib/auth/requester";

// PRD F-02 — 게스트 세션 발급. 클라이언트는 게스트 흐름에 들어설 때 이 엔드포인트를 호출하고,
// 서버가 httpOnly 쿠키로 신원을 심는다. 멱등하므로 여러 번 불러도 세션은 하나다.
//
// 응답에 guest_session_id를 담지 않는다 — 그 값이 곧 소유 증명이라, 클라이언트가 알면
// 요청 본문에 실어 남을 사칭할 수 있다 (#126).
export async function POST() {
  // 회원에게는 게스트 세션을 발급하지 않는다. 클라이언트는 로그인 여부를 모른 채 이 함수를
  // 부르므로(TestLayout 등) 서버가 한 곳에서 걸러야 빈 guest_sessions row가 쌓이지 않는다.
  const requester = await getRequester();
  if (requester.kind === "user") {
    return apiSuccess({ established: true });
  }

  const existingId = await readGuestSessionId();
  const result = await resolveGuestSession(existingId);

  if (!result.ok) {
    return apiError("INTERNAL_ERROR", result.error, 500);
  }

  if (result.isNew) {
    await setGuestSessionCookie(result.value.id);
  }

  return apiSuccess({ established: true }, result.isNew ? 201 : 200);
}
