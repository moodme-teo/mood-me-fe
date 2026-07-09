import "server-only";

import { getCompletedMoodTestSession } from "@/lib/mood-test/get-completed-session";
import type { Journey } from "@/lib/mood-test/journey";
import { assembleBoard } from "@/lib/moodboard/assemble-board";
import { createServiceClient } from "@/lib/supabase/service";

type ServiceClient = ReturnType<typeof createServiceClient>;

export type CreateGenerationJobResult =
  | { ok: true; value: { jobId: string; journey: Journey } }
  | { ok: false; code: "NOT_FOUND" | "GENERATION_FAILED"; error: string };

// 세션 검증 + job row 생성만 하는 빠른 경로 — Route Handler가 응답을 돌려주기 전에 동기로
// 기다리는 부분은 이만큼만이다. 무거운 분석·조립은 runGenerationPipeline이 after()로 이어받는다.
export async function createGenerationJob(
  testSessionId: string,
): Promise<CreateGenerationJobResult> {
  const sessionResult = await getCompletedMoodTestSession(testSessionId);
  if (!sessionResult.ok) {
    return { ok: false, code: "NOT_FOUND", error: sessionResult.error };
  }

  const service = createServiceClient();
  const { data: job, error: createError } = await service
    .from("moodboard_generation_jobs")
    .insert({ test_session_id: testSessionId, status: "queued" })
    .select("id")
    .single();

  if (createError || !job) {
    return {
      ok: false,
      code: "GENERATION_FAILED",
      error: createError?.message ?? "생성 job을 만들지 못했습니다",
    };
  }

  return {
    ok: true,
    value: {
      jobId: (job as { id: string }).id,
      journey: sessionResult.value.journey,
    },
  };
}

async function markJobFailed(
  service: ServiceClient,
  jobId: string,
  message: string,
) {
  await service
    .from("moodboard_generation_jobs")
    .update({
      status: "failed",
      status_message: message,
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId);
}

// 여정 로그를 규칙 기반으로 보드까지 조립해 job을 completed로 채운다.
// next/server의 after()로 응답을 먼저 보낸 뒤 백그라운드에서 실행된다 — 클라이언트는
// createGenerationJob이 즉시 돌려준 jobId로 GET .../generation-job을 폴링해 진행률을 본다.
// 실패는 throw하지 않고 job.status를 failed로 남기는 것으로만 알린다(응답이 이미 나갔으므로
// 여기서 던져도 받을 곳이 없다).
//
// 리포트용 GPT-5 호출(mood_profile 생성)은 당분간 스킵한다 — 실제 페이로드 크기에서
// 타임아웃으로 파이프라인 전체가 막히는 문제가 있어 별도 이슈(#94)로 분리했다. job의
// mood_profile은 그동안 null로 남는다 — 편집 화면(elements·baseImageUrl만 사용)은 영향 없음.
export async function runGenerationPipeline(
  jobId: string,
  journey: Journey,
): Promise<void> {
  const service = createServiceClient();

  await service
    .from("moodboard_generation_jobs")
    .update({
      status: "processing",
      progress_percent: 10,
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId);

  let assembled: Awaited<ReturnType<typeof assembleBoard>>;
  try {
    assembled = await assembleBoard(journey);
  } catch {
    await markJobFailed(service, jobId, "보드 조립에 실패했습니다");
    return;
  }

  await service
    .from("moodboard_generation_jobs")
    .update({
      elements: assembled.elements,
      base_image_url: assembled.baseImageUrl,
      status: "completed",
      progress_percent: 100,
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId);
}
