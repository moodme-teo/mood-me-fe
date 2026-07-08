import "server-only";

import { journeySchema } from "@/lib/mood-test/journey";
import type { Journey } from "@/lib/mood-test/journey";
import { createServiceClient } from "@/lib/supabase/service";

// Supabase 생성 타입이 아직 없어 API 경계에서 row 타입을 손으로 좁힌다
// (src/lib/moodboard/list.ts와 동일한 패턴).
type MoodTestSessionRow = {
  id: string;
  status: string;
  journey: unknown;
};

export type GetCompletedSessionResult =
  | { ok: true; value: { id: string; journey: Journey } }
  | { ok: false; error: string };

export async function getCompletedMoodTestSession(
  sessionId: string,
): Promise<GetCompletedSessionResult> {
  const service = createServiceClient();
  const { data, error } = await service
    .from("mood_test_sessions")
    .select("id, status, journey")
    .eq("id", sessionId)
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message };
  }
  if (!data) {
    return { ok: false, error: "테스트 세션을 찾을 수 없습니다" };
  }

  const row = data as MoodTestSessionRow;
  if (row.status !== "completed") {
    return { ok: false, error: "완료되지 않은 테스트 세션입니다" };
  }

  const parsed = journeySchema.safeParse(row.journey);
  if (!parsed.success) {
    return { ok: false, error: "여정 데이터 형식이 올바르지 않습니다" };
  }

  return { ok: true, value: { id: row.id, journey: parsed.data } };
}
