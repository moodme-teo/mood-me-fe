import "server-only";

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

// 여정을 GPT-5로 해석해 리포트 재료(mood_profile)를 만든다. 보드 이미지 생성과
// 완전히 독립적으로 돈다 — runGenerationPipeline이 await하지 않고 fire-and-forget으로
// 띄우며, 실패(타임아웃 포함)해도 여기서 조용히 포기한다. job의 status·progress_percent는
// 이미지 파이프라인만 소유하므로 리포트 실패가 캔버스 진입을 막지 않는다. 지금 mood_profile을
// 읽는 화면이 없어 실패해도 사용자에게 노출되는 영향은 없다.
async function runReportAnalysis(
  service: ServiceClient,
  jobId: string,
  journey: Journey,
): Promise<void> {
  const payload = buildMoodAnalysisPayload(journey);

  let text: string;
  try {
    text = await callGpt(buildMoodAnalysisUserMessage(payload));
  } catch (error) {
    console.warn(
      "[runReportAnalysis] GPT-5 호출 실패 — mood_profile 없이 진행:",
      error,
    );
    return;
  }

  let parsed = parseMoodAnalysis(text);
  if (!parsed.ok) {
    // Zod 파싱 실패 시 1회 재시도 — 파싱 에러를 프롬프트에 포함해 재요청 (docs/convention/ai.md)
    try {
      text = await callGpt(
        buildMoodAnalysisRetryMessage(payload, parsed.error),
      );
    } catch (error) {
      console.warn(
        "[runReportAnalysis] GPT-5 재시도 실패 — mood_profile 없이 진행:",
        error,
      );
      return;
    }
    parsed = parseMoodAnalysis(text);
  }
  if (!parsed.ok) {
    console.warn(
      "[runReportAnalysis] 응답 파싱 실패 — mood_profile 없이 진행:",
      parsed.error,
    );
    return;
  }

  // type_name은 GPT-5가 아니라 computePersonaResult가 이미 확정한 값
  // (payload.persona.type_name) — 여기서 합쳐 MoodProfile 완전한 형태로 저장한다
  // (ADR 004 §개정).
  const moodProfile: MoodProfile = {
    ...parsed.value,
    type_name: payload.persona.type_name,
  };

  await service
    .from("moodboard_generation_jobs")
    .update({
      mood_profile: moodProfile,
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId);
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

  await service
    .from("moodboard_generation_jobs")
    .update({
      status: "processing",
      progress_percent: 10,
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId);

  void runReportAnalysis(service, jobId, journey).catch((error) => {
    console.error(
      "[runReportAnalysis] 예기치 못한 실패 — mood_profile 없이 진행:",
      error,
    );
  });

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
