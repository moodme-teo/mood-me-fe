import { apiError, apiSuccess } from "@/lib/api-response";
import { createGuestSession } from "@/lib/auth/create-guest-session";

// PRD F-02 — 게스트 세션 발급. 클라이언트는 앱 첫 진입 시 이 엔드포인트를 한 번 호출해
// localStorage에 id를 저장하고 재사용한다 (src/lib/auth/guest-session.ts).
export async function POST() {
  const result = await createGuestSession();
  if (!result.ok) {
    return apiError("INTERNAL_ERROR", result.error, 500);
  }

  return apiSuccess(result.value, 201);
}
