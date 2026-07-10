import "server-only";

import type { Requester } from "@/lib/auth/requester";
import { isOwnerOf } from "@/lib/auth/requester";
import { journeySchema } from "@/lib/mood-test/journey";
import type { Journey } from "@/lib/mood-test/journey";
import { createServiceClient } from "@/lib/supabase/service";

// Supabase 생성 타입이 아직 없어 API 경계에서 row 타입을 손으로 좁힌다
// (src/lib/moodboard/list.ts와 동일한 패턴).
type MoodTestSessionRow = {
  id: string;
  status: string;
  journey: unknown;
  user_id: string | null;
  guest_session_id: string | null;
};

export type GetCompletedSessionResult =
  | { ok: true; value: { id: string; journey: Journey } }
  | { ok: false; error: string };

// 소유자 불일치는 "없음"과 같은 문구로 답한다 — 세션의 존재 여부를 흘리지 않기 위해서다 (#126).
const NOT_FOUND_MESSAGE = "테스트 세션을 찾을 수 없습니다";

export async function getCompletedMoodTestSession(
  sessionId: string,
  requester: Requester,
): Promise<GetCompletedSessionResult> {
  const service = createServiceClient();
  const { data, error } = await service
    .from("mood_test_sessions")
    .select("id, status, journey, user_id, guest_session_id")
    .eq("id", sessionId)
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message };
  }
  if (!data) {
    return { ok: false, error: NOT_FOUND_MESSAGE };
  }

  const row = data as MoodTestSessionRow;

  // sessionId는 클라이언트가 만들어 주장하는 값이라, 아는 것만으로는 소유를 증명하지 못한다.
  if (!isOwnerOf(requester, row)) {
    return { ok: false, error: NOT_FOUND_MESSAGE };
  }

  if (row.status !== "completed") {
    return { ok: false, error: "완료되지 않은 테스트 세션입니다" };
  }

  const parsed = journeySchema.safeParse(row.journey);
  if (!parsed.success) {
    return { ok: false, error: "여정 데이터 형식이 올바르지 않습니다" };
  }

  return { ok: true, value: { id: row.id, journey: parsed.data } };
}
