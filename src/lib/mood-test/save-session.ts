// 완료된 추구미 테스트 세션 저장 서비스 함수. Route Handler(app/api/mood-test-sessions/route.ts)에서
// 얇게 호출한다 (docs/convention/api.md).

import "server-only";

import { z } from "zod";

import { getRequester, ownerColumnsOf } from "@/lib/auth/requester";
import { journeySchema } from "@/lib/mood-test/journey";
import { createServiceClient } from "@/lib/supabase/service";

export const saveSessionRequestSchema = z.object({
  sessionId: z.uuid(),
  // 소유자(회원·게스트)는 서버가 쿠키로만 확인한다 — 본문으로 받지 않는다 (#126).
  journey: journeySchema,
});

export type SaveSessionRequest = z.infer<typeof saveSessionRequestSchema>;
export type SaveSessionResult = { id: string; status: "completed" };

// Postgres unique_violation — 같은 sessionId의 row가 이미 있다는 뜻.
const UNIQUE_VIOLATION = "23505";

export type SaveSessionOutcome =
  | { ok: true; value: SaveSessionResult }
  | {
      ok: false;
      code: "UNAUTHORIZED" | "NOT_FOUND" | "INTERNAL_ERROR";
      error: string;
    };

// 검증 함수/서비스 함수 반환 형태 통일: { ok: true, value } | { ok: false, error } (docs/convention/type.md)
export async function saveMoodTestSession(
  input: SaveSessionRequest,
): Promise<SaveSessionOutcome> {
  const { sessionId, journey } = input;

  const requester = await getRequester();
  if (requester.kind === "anonymous") {
    return {
      ok: false,
      code: "UNAUTHORIZED",
      error: "세션이 만료됐어요. 처음부터 다시 시작해 주세요.",
    };
  }

  const service = createServiceClient();

  // 쿠키가 가리키는 guest_sessions row가 정리됐을 수 있어 FK를 지키는 안전장치를 남긴다.
  if (requester.kind === "guest") {
    const { error: guestError } = await service
      .from("guest_sessions")
      .upsert(
        { id: requester.guestSessionId },
        { onConflict: "id", ignoreDuplicates: true },
      );
    if (guestError) {
      return { ok: false, code: "INTERNAL_ERROR", error: guestError.message };
    }
  }

  // 신규 생성을 먼저 시도한다. "소유자 조회 후 upsert"는 두 요청이 동시에 "row 없음"을 보고
  // 둘 다 쓰는 경합(TOCTOU)에 뚫리므로, PK 충돌 판정을 DB에 맡긴다 (#126).
  const { data: inserted, error: insertError } = await service
    .from("mood_test_sessions")
    .insert({
      id: sessionId,
      ...ownerColumnsOf(requester),
      status: "completed",
      journey,
    })
    .select("id, status")
    .maybeSingle();

  if (!insertError && inserted) {
    return { ok: true, value: inserted as SaveSessionResult };
  }
  if (insertError && insertError.code !== UNIQUE_VIOLATION) {
    return { ok: false, code: "INTERNAL_ERROR", error: insertError.message };
  }

  // 이미 있는 세션 — 소유자가 일치할 때만 갱신한다. 소유자 조건을 WHERE 절에 실어 보내므로
  // 확인과 쓰기 사이에 틈이 없고, 소유자 컬럼 자체는 갱신 대상에서 빠져 불변이다.
  const ownerColumn =
    requester.kind === "user" ? "user_id" : "guest_session_id";
  const ownerValue =
    requester.kind === "user" ? requester.userId : requester.guestSessionId;

  const { data: updated, error: updateError } = await service
    .from("mood_test_sessions")
    .update({
      status: "completed",
      journey,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId)
    .eq(ownerColumn, ownerValue)
    .select("id, status")
    .maybeSingle();

  if (updateError) {
    return { ok: false, code: "INTERNAL_ERROR", error: updateError.message };
  }

  // 갱신된 row가 없다 = 남의 세션이다. 403은 "존재하지만 네 것이 아니다"를 흘리므로
  // 존재하지 않을 때와 같은 404로 뭉갠다 (#126).
  if (!updated) {
    return {
      ok: false,
      code: "NOT_FOUND",
      error: "테스트 세션을 찾을 수 없어요.",
    };
  }

  return { ok: true, value: updated as SaveSessionResult };
}
