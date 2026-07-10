import "server-only";

import type { Requester } from "@/lib/auth/requester";
import { getEliceClient, GPT_MODEL } from "@/lib/elice-ai";
import { buildMoodAnalysisPayload } from "@/lib/mood-test/build-analysis-payload";
import { getCompletedMoodTestSession } from "@/lib/mood-test/get-completed-session";
import type { Journey } from "@/lib/mood-test/journey";
import { assembleBoard } from "@/lib/moodboard/assemble-board";
import {
  buildMoodAnalysisRetryMessage,
  buildMoodAnalysisSystemPrompt,
  buildMoodAnalysisUserMessage,
  moodAnalysisSchema,
} from "@/lib/prompts";
import type { MoodAnalysis } from "@/lib/prompts";
import { createServiceClient } from "@/lib/supabase/service";
import type { MoodProfile } from "@/types/moodboard";

// GPT-5는 추론 모델이라 답을 쓰기 전에 reasoning_tokens를 먼저 소모한다 — 실제 프로덕션
// 페이로드 크기로 실측(2026-07-09)한 결과 reasoning에만 ~3968 토큰을 쓰고 완성까지 총
// ~95초가 걸렸다(reasoning_effort 기본값). 3072 예산은 reasoning만으로 꽉 차 content가
// 아예 안 나왔다(빈 응답). 8192로 올려 여유를 두고, 타임아웃도 그에 맞춰 120초로 올렸다 —
// 리포트는 이미지 생성과 독립적으로(fire-and-forget) 돌기 때문에 늘려도 캔버스 진입엔
// 영향 없다. 이 상수·옵션은 리포트 호출(callGpt) 전용이다 — 이미지 생성 쪽 elice-ai.ts
// 클라이언트 설정·모델 상수는 이 파일에서 손대지 않는다.
const GPT_TIMEOUT_MS = 120_000;
const GPT_MAX_COMPLETION_TOKENS = 8192;

type ServiceClient = ReturnType<typeof createServiceClient>;

export type CreateGenerationJobResult =
  | { ok: true; value: { jobId: string; journey: Journey; isNew: boolean } }
  | { ok: false; code: "NOT_FOUND" | "GENERATION_FAILED"; error: string };

// 세션 검증 + job row 생성만 하는 빠른 경로 — Route Handler가 응답을 돌려주기 전에 동기로
// 기다리는 부분은 이만큼만이다. 무거운 분석·조립은 runGenerationPipeline이 after()로 이어받는다.
//
// 소유자 확인이 여기서 끝나므로 after()로 넘어가는 journey는 이미 검증된 값이다 — 남의
// sessionId만으로 GPT-5·gpt-image-2를 돌려 실비용을 발생시킬 수 없다 (#126).
//
// 클라이언트(useGenerationPolling)가 재진입 시 이 호출을 건너뛰는 것과 별개로, 이 함수를
// 직접 부르는 경로(중복 탭, 재시도 연타, API 직접 호출)가 남아있어 서버에서도 막는다 —
// 이 세션에 진행 중(queued·processing)인 job이 있으면 새로 만들지 않고 그 job을 돌려준다
// (#115). 완료·실패한 job은 재사용 대상이 아니다 — 재시도는 새 job이어야 한다.
export async function createGenerationJob(
  testSessionId: string,
  requester: Requester,
): Promise<CreateGenerationJobResult> {
  const sessionResult = await getCompletedMoodTestSession(
    testSessionId,
    requester,
  );
  if (!sessionResult.ok) {
    return { ok: false, code: "NOT_FOUND", error: sessionResult.error };
  }

  const service = createServiceClient();

  const { data: activeJob, error: activeJobError } = await service
    .from("moodboard_generation_jobs")
    .select("id")
    .eq("test_session_id", testSessionId)
    .in("status", ["queued", "processing"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (activeJobError) {
    return {
      ok: false,
      code: "GENERATION_FAILED",
      error: activeJobError.message,
    };
  }
  if (activeJob) {
    return {
      ok: true,
      value: {
        jobId: (activeJob as { id: string }).id,
        journey: sessionResult.value.journey,
        isNew: false,
      },
    };
  }

  // 직전 job에서 분석이 이미 성공했으면 새 job도 그 결과를 그대로 이어받는다 — 이미지만
  // 실패해 재시도하는 경우 분석(GPT-5)까지 다시 부르면 그만큼 비용이 또 나간다. "재시도는
  // 실패한 갈래만 다시 돈다"(#122). runGenerationPipeline이 이 값을 보고 분석 재호출 여부를 정한다.
  const { data: priorJob } = await service
    .from("moodboard_generation_jobs")
    .select("analysis_status, mood_profile")
    .eq("test_session_id", testSessionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const priorAnalysis = priorJob as {
    analysis_status: string;
    mood_profile: unknown;
  } | null;
  const carryOverAnalysis =
    priorAnalysis?.analysis_status === "completed"
      ? {
          analysis_status: "completed" as const,
          mood_profile: priorAnalysis.mood_profile,
        }
      : {};

  const { data: job, error: createError } = await service
    .from("moodboard_generation_jobs")
    .insert({
      test_session_id: testSessionId,
      status: "queued",
      ...carryOverAnalysis,
    })
    .select("id")
    .single();

  // 위 SELECT와 이 INSERT 사이에는 완전히 동시에 들어온 두 요청을 막을 수 없는 틈이
  // 있다(TOCTOU) — 실측(#115 검증)으로 재현됨. 그 틈을 DB의 부분 unique 인덱스
  // (moodboard_generation_jobs_one_active_per_session, 마이그레이션 20260710120000)가
  // 최종적으로 막는다. 위반 시 postgres가 23505를 주는데, 그건 "내가 졌다"는 뜻이 아니라
  // "이미 누가 만들었다"는 뜻이므로 실패로 취급하지 않고 그 job을 다시 조회해 돌려준다.
  if (createError?.code === "23505") {
    const { data: winner, error: winnerError } = await service
      .from("moodboard_generation_jobs")
      .select("id")
      .eq("test_session_id", testSessionId)
      .in("status", ["queued", "processing"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (winnerError || !winner) {
      return {
        ok: false,
        code: "GENERATION_FAILED",
        error: winnerError?.message ?? "생성 job을 확인하지 못했습니다",
      };
    }

    return {
      ok: true,
      value: {
        jobId: (winner as { id: string }).id,
        journey: sessionResult.value.journey,
        isNew: false,
      },
    };
  }

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
      isNew: true,
    },
  };
}

async function callGpt(userMessage: string): Promise<string> {
  const response = await getEliceClient().chat.completions.create(
    {
      model: GPT_MODEL,
      max_completion_tokens: GPT_MAX_COMPLETION_TOKENS,
      // Elice 실측(2026-07-09): gpt-5는 json_object를 지원한다 — 모델이 JSON 문법을
      // 어기지 않도록 강제해 파싱 실패로 인한 재시도 케이스를 줄인다.
      response_format: { type: "json_object" },
      // reasoning_effort를 낮추면 reasoning_tokens가 확 줄어 완성까지 걸리는 시간도
      // 크게 준다(실측: 기본값 95초 → low 39초, 이미지 생성 시간대와 비슷해짐).
      // 실제 프롬프트로 품질 저하 없이 확인됨 — 여정 근거를 구체적으로 인용하는 문장이 그대로 나옴.
      reasoning_effort: "low",
      messages: [
        { role: "system", content: buildMoodAnalysisSystemPrompt() },
        { role: "user", content: userMessage },
      ],
    },
    {
      timeout: GPT_TIMEOUT_MS,
      // openai SDK 기본값(maxRetries: 2)을 이 호출에서만 끈다 — 아래 파싱 재시도가 이미
      // 의미 있는 재시도를 하고 있어서, SDK가 타임아웃마다 내부적으로 또 재시도하면 실제
      // 대기 시간이 설정한 timeout의 최대 3배까지 조용히 늘어난다(실측: 120초 설정 →
      // 350초+ 대기). 이 옵션은 이 요청에만 적용되고 elice-ai.ts의 공용 클라이언트
      // 기본값(이미지 생성 쪽이 함께 쓰는)은 그대로 둔다.
      maxRetries: 0,
    },
  );

  return response.choices[0]?.message.content ?? "";
}

function parseMoodAnalysis(
  text: string,
): { ok: true; value: MoodAnalysis } | { ok: false; error: string } {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: "유효한 JSON이 아닙니다" };
  }

  const parsed = moodAnalysisSchema.safeParse(json);
  if (!parsed.success) {
    const message = parsed.error.issues
      .map((issue) => issue.message)
      .join("; ");
    return { ok: false, error: message };
  }
  return { ok: true, value: parsed.data };
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

// analysis_status는 job.status와 별개다 — 이미지 갈래가 실패해도 분석 갈래는 성공할 수 있고
// 그 반대도 같다. 이걸 구별해야 결과 페이지가 "아직 안 끝남"과 "실패"를 오검출하지 않는다(#122).
async function markAnalysisFailed(service: ServiceClient, jobId: string) {
  await service
    .from("moodboard_generation_jobs")
    .update({
      analysis_status: "failed",
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId);
}

// GPT-5 호출 + 파싱(+1회 재시도)만 하는 순수 로직 — 어디에 결과를 쓸지는 모른다. job(생성중
// 화면의 최초 분석)과 저장된 moodboard(결과 페이지의 "분석 다시 시도") 둘 다 이걸 재사용하고,
// 각자 자기 테이블에 analysis_status·mood_profile을 기록한다(#122).
async function analyzeJourney(
  journey: Journey,
): Promise<{ ok: true; moodProfile: MoodProfile } | { ok: false }> {
  const payload = buildMoodAnalysisPayload(journey);

  let text: string;
  try {
    text = await callGpt(buildMoodAnalysisUserMessage(payload));
  } catch (error) {
    console.warn("[analyzeJourney] GPT-5 호출 실패:", error);
    return { ok: false };
  }

  let parsed = parseMoodAnalysis(text);
  if (!parsed.ok) {
    // Zod 파싱 실패 시 1회 재시도 — 파싱 에러를 프롬프트에 포함해 재요청 (docs/convention/ai.md)
    try {
      text = await callGpt(
        buildMoodAnalysisRetryMessage(payload, parsed.error),
      );
    } catch (error) {
      console.warn("[analyzeJourney] GPT-5 재시도 실패:", error);
      return { ok: false };
    }
    parsed = parseMoodAnalysis(text);
  }
  if (!parsed.ok) {
    console.warn("[analyzeJourney] 응답 파싱 실패:", parsed.error);
    return { ok: false };
  }

  // type_name은 GPT-5가 아니라 computePersonaResult가 이미 확정한 값
  // (payload.persona.type_name) — 여기서 합쳐 MoodProfile 완전한 형태로 저장한다
  // (ADR 004 §개정).
  return {
    ok: true,
    moodProfile: { ...parsed.value, type_name: payload.persona.type_name },
  };
}

// 여정을 GPT-5로 해석해 리포트 재료(mood_profile)를 만든다. 보드 이미지 생성과 완전히
// 독립적으로 돈다 — runGenerationPipeline이 await하지 않고 fire-and-forget으로 띄운다.
// job의 status·progress_percent(이미지 갈래)는 건드리지 않고, analysis_status(분석 갈래)만
// 시작·성공·실패를 기록한다. 실패해도 캔버스 진입은 막지 않는다 — 결과 페이지에서만 드러나고
// 그 자리에서 재시도한다(§5.6·§10.3).
async function runReportAnalysis(
  service: ServiceClient,
  jobId: string,
  journey: Journey,
): Promise<void> {
  await service
    .from("moodboard_generation_jobs")
    .update({
      analysis_status: "processing",
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId);

  const result = await analyzeJourney(journey);
  if (!result.ok) {
    await markAnalysisFailed(service, jobId);
    return;
  }

  await service
    .from("moodboard_generation_jobs")
    .update({
      mood_profile: result.moodProfile,
      analysis_status: "completed",
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId);
}

// 결과 페이지의 "분석 다시 시도"(§5.6·§10.3) — 이미 저장된 moodboard row에 직접 쓴다.
// job을 거치지 않는다: elements·base_image_url·exported_image_url이 저장 후엔
// moodboard 자신이 원본이 되는 기존 패턴과 같다. 호출부(POST /api/moodboards/[id]/analysis)가
// analysis_status를 "processing"으로 먼저 써 두므로, 여기서는 최종 결과(성공/실패)만 쓴다.
export async function runMoodboardAnalysisRetry(
  moodboardId: string,
  journey: Journey,
): Promise<void> {
  const service = createServiceClient();
  const result = await analyzeJourney(journey);

  if (!result.ok) {
    await service
      .from("moodboards")
      .update({
        analysis_status: "failed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", moodboardId);
    return;
  }

  await service
    .from("moodboards")
    .update({
      mood_profile: result.moodProfile,
      analysis_status: "completed",
      updated_at: new Date().toISOString(),
    })
    .eq("id", moodboardId);
}

// 여정 로그를 규칙 기반으로 보드까지 조립해 job을 completed로 채운다. 리포트(GPT-5)는
// runReportAnalysis로 별도로 띄우고 여기서는 기다리지 않는다 — 이미지 생성이 곧 job의
// 완료 여부를 결정한다. next/server의 after()로 응답을 먼저 보낸 뒤 백그라운드에서
// 실행된다 — 클라이언트는 createGenerationJob이 즉시 돌려준 jobId로
// GET .../generation-job을 폴링해 진행률을 본다. 실패는 throw하지 않고 job.status를
// failed로 남기는 것으로만 알린다(응답이 이미 나갔으므로 여기서 던져도 받을 곳이 없다).
export async function runGenerationPipeline(
  jobId: string,
  journey: Journey,
): Promise<void> {
  const service = createServiceClient();

  // createGenerationJob이 직전 job에서 완료된 분석을 이 job에 이미 이어받았을 수 있다
  // (이미지만 재시도하는 경우) — 그러면 분석은 다시 부르지 않는다. 재호출하면 이미 성공한
  // 분석에 GPT-5 비용을 한 번 더 태우게 된다(#122).
  const { data: currentJob } = await service
    .from("moodboard_generation_jobs")
    .select("analysis_status")
    .eq("id", jobId)
    .maybeSingle();
  const analysisAlreadyDone =
    (currentJob as { analysis_status: string } | null)?.analysis_status ===
    "completed";

  await service
    .from("moodboard_generation_jobs")
    .update({
      status: "processing",
      progress_percent: 10,
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId);

  if (!analysisAlreadyDone) {
    void runReportAnalysis(service, jobId, journey).catch((error) => {
      console.error(
        "[runReportAnalysis] 예기치 못한 실패 — mood_profile 없이 진행:",
        error,
      );
      void markAnalysisFailed(service, jobId);
    });
  }

  let assembled: Awaited<ReturnType<typeof assembleBoard>>;
  try {
    assembled = await assembleBoard(journey);
  } catch (error) {
    console.error("[runGenerationPipeline] 보드 조립 실패:", error);
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
