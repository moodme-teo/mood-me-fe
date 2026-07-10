// 결과 페이지 "분석 다시 시도"(#122, PRD §5.6·§10.3)의 준비 단계 — 소유자 확인 → 원본
// journey 조회 → processing 마킹까지만 한다. 실제 GPT-5 호출은 after()로 백그라운드에
// 띄운다(runMoodboardAnalysisRetry, generate-mood-analysis.ts) — 응답을 빨리 돌려줘야
// 사용자가 결과 페이지에서 오래 기다리지 않는다.

import "server-only";

import { isOwnerOf } from "@/lib/auth/requester";
import type { Requester } from "@/lib/auth/requester";
import { journeySchema } from "@/lib/mood-test/journey";
import type { Journey } from "@/lib/mood-test/journey";
import { createServiceClient } from "@/lib/supabase/service";
import type { AnalysisStatus } from "@/types/moodboard";

type MoodboardRow = {
  user_id: string | null;
  guest_session_id: string | null;
  test_session_id: string | null;
  analysis_status: AnalysisStatus | null;
};

export type StartAnalysisRetryResult =
  | { ok: true; value: { journey: Journey; alreadyRunning: boolean } }
  | { ok: false; code: "NOT_FOUND" | "GENERATION_FAILED"; error: string };

// 소유자가 아니면 보드의 존재 여부를 흘리지 않도록 항상 같은 NOT_FOUND로 답한다 (#126과 같은 원칙).
const NOT_FOUND_MESSAGE = "무드보드를 찾지 못했어요.";

export async function startMoodboardAnalysisRetry(
  moodboardId: string,
  requester: Requester,
): Promise<StartAnalysisRetryResult> {
  if (requester.kind === "anonymous") {
    return { ok: false, code: "NOT_FOUND", error: NOT_FOUND_MESSAGE };
  }

  const service = createServiceClient();
  const { data, error } = await service
    .from("moodboards")
    .select("user_id, guest_session_id, test_session_id, analysis_status")
    .eq("id", moodboardId)
    .maybeSingle();

  if (error || !data) {
    return { ok: false, code: "NOT_FOUND", error: NOT_FOUND_MESSAGE };
  }

  const row = data as MoodboardRow;
  if (!isOwnerOf(requester, row)) {
    return { ok: false, code: "NOT_FOUND", error: NOT_FOUND_MESSAGE };
  }

  // 이 컬럼이 생기기 전에 저장된 보드이거나(레거시), 최초 저장이 sessionId 없이 이뤄진 경우 —
  // 되짚어갈 journey가 없어 재시도할 수 없다.
  if (!row.test_session_id) {
    return {
      ok: false,
      code: "GENERATION_FAILED",
      error: "이 무드보드는 다시 분석할 원본 정보가 없어요.",
    };
  }

  const { data: sessionRow, error: sessionError } = await service
    .from("mood_test_sessions")
    .select("journey")
    .eq("id", row.test_session_id)
    .maybeSingle();

  if (sessionError || !sessionRow) {
    return {
      ok: false,
      code: "GENERATION_FAILED",
      error: "원본 테스트 결과를 찾지 못했어요.",
    };
  }

  const parsedJourney = journeySchema.safeParse(
    (sessionRow as { journey: unknown }).journey,
  );
  if (!parsedJourney.success) {
    return {
      ok: false,
      code: "GENERATION_FAILED",
      error: "여정 데이터 형식이 올바르지 않아요.",
    };
  }

  // 연타 방어 — 이미 도는 중이면 새로 트리거하지 않는다(#115와 같은 원칙, 서버 방어).
  const alreadyRunning = row.analysis_status === "processing";
  if (!alreadyRunning) {
    await service
      .from("moodboards")
      .update({
        analysis_status: "processing",
        updated_at: new Date().toISOString(),
      })
      .eq("id", moodboardId);
  }

  return { ok: true, value: { journey: parsedJourney.data, alreadyRunning } };
}
