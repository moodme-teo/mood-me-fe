// 완료된 추구미 테스트 세션 저장 서비스 함수. Route Handler(app/api/mood-test-sessions/route.ts)에서
// 얇게 호출한다 (docs/convention/api.md). #35가 이 요청을 클라이언트에서 쏘게 되면
// 이 파일의 saveSessionRequestSchema를 lib/api/의 클라이언트 요청 선언에서 재사용할 것.

import "server-only";

import { z } from "zod";

import { journeySchema } from "@/lib/mood-test/journey";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const saveSessionRequestSchema = z.object({
  sessionId: z.uuid(),
  guestSessionId: z.uuid().optional(),
  journey: journeySchema,
});

export type SaveSessionRequest = z.infer<typeof saveSessionRequestSchema>;
export type SaveSessionResult = { id: string; status: "completed" };

// 검증 함수/서비스 함수 반환 형태 통일: { ok: true, value } | { ok: false, error } (docs/convention/type.md)
export async function saveMoodTestSession(
  input: SaveSessionRequest,
): Promise<
  { ok: true; value: SaveSessionResult } | { ok: false; error: string }
> {
  const { sessionId, guestSessionId, journey } = input;

  // 로그인 여부는 서버가 인증 세션(쿠키)으로 직접 확인한다 — user_id를 클라이언트가
  // 요청 본문에 자칭하도록 두지 않는다. 로그인 상태가 아니면 게스트로 취급한다.
  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user && !guestSessionId) {
    return {
      ok: false,
      error: "로그인 상태가 아니면 guestSessionId가 필요합니다",
    };
  }

  const service = createServiceClient();

  // guest_sessions 발급 엔드포인트(POST /guest-sessions)가 아직 없어서, 게스트 세션
  // row가 없으면 여기서 즉시 만들어준다 (FK 충족용 임시 조치 — 발급 엔드포인트가 생기면
  // 이 upsert는 항상 no-op이 된다).
  if (!user && guestSessionId) {
    const { error: guestError } = await service
      .from("guest_sessions")
      .upsert(
        { id: guestSessionId },
        { onConflict: "id", ignoreDuplicates: true },
      );
    if (guestError) {
      return { ok: false, error: guestError.message };
    }
  }

  const { data, error } = await service
    .from("mood_test_sessions")
    .upsert(
      {
        id: sessionId,
        user_id: user?.id ?? null,
        guest_session_id: user ? null : guestSessionId,
        status: "completed",
        journey,
      },
      { onConflict: "id" },
    )
    .select("id, status")
    .single();

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, value: data as SaveSessionResult };
}
