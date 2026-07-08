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

const GPT_TIMEOUT_MS = 30_000;
const GPT_MAX_COMPLETION_TOKENS = 2048;

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
      messages: [
        { role: "system", content: buildMoodAnalysisSystemPrompt() },
        { role: "user", content: userMessage },
      ],
    },
    { timeout: GPT_TIMEOUT_MS },
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

// 여정 로그를 AI(GPT-5)로 해석하고 보드까지 조립해 job을 completed로 채운다.
// next/server의 after()로 응답을 먼저 보낸 뒤 백그라운드에서 실행된다 — 클라이언트는
// createGenerationJob이 즉시 돌려준 jobId로 GET .../generation-job을 폴링해 진행률을 본다.
// 실패는 throw하지 않고 job.status를 failed로 남기는 것으로만 알린다(응답이 이미 나갔으므로
// 여기서 던져도 받을 곳이 없다).
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

  const payload = buildMoodAnalysisPayload(journey);

  let text: string;
  try {
    text = await callGpt(buildMoodAnalysisUserMessage(payload));
  } catch {
    await markJobFailed(service, jobId, "AI 응답을 받지 못했습니다");
    return;
  }

  let parsed = parseMoodAnalysis(text);
  if (!parsed.ok) {
    // Zod 파싱 실패 시 서버에서 1회 재시도 — 파싱 에러를 프롬프트에 포함해 재요청 (docs/convention/ai.md)
    try {
      text = await callGpt(
        buildMoodAnalysisRetryMessage(payload, parsed.error),
      );
    } catch {
      await markJobFailed(service, jobId, "AI 응답을 받지 못했습니다");
      return;
    }
    parsed = parseMoodAnalysis(text);
  }

  if (!parsed.ok) {
    await markJobFailed(service, jobId, "무드 프로파일 생성에 실패했습니다");
    return;
  }

  await service
    .from("moodboard_generation_jobs")
    .update({
      mood_profile: parsed.value,
      progress_percent: 45,
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId);

  let assembled: Awaited<ReturnType<typeof assembleBoard>>;
  try {
    assembled = await assembleBoard(parsed.value, payload.persona_scores);
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
