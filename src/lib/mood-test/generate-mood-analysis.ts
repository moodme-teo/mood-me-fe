import "server-only";

import { getEliceClient, GPT_MODEL } from "@/lib/elice-ai";
import { buildMoodAnalysisPayload } from "@/lib/mood-test/build-analysis-payload";
import { getCompletedMoodTestSession } from "@/lib/mood-test/get-completed-session";
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

export type GenerateMoodAnalysisResult =
  | { ok: true; value: { jobId: string; moodProfile: MoodAnalysis } }
  | {
      ok: false;
      code: "NOT_FOUND" | "AI_TIMEOUT" | "GENERATION_FAILED";
      error: string;
    };

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

// 여정 로그를 AI(GPT-5, Elice AX 프록시)로 해석해 무드 프로파일을 뽑고 moodboard_generation_jobs row에 채운다.
// 이 함수가 job의 생명주기(생성 → processing → mood_profile 채움 | failed)를 소유한다.
// status는 processing까지만 — completed 전환은 #37(보드 조립)이 이어받는다.
export async function generateMoodAnalysis(
  testSessionId: string,
): Promise<GenerateMoodAnalysisResult> {
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

  const jobId = (job as { id: string }).id;

  await service
    .from("moodboard_generation_jobs")
    .update({ status: "processing", updated_at: new Date().toISOString() })
    .eq("id", jobId);

  const payload = buildMoodAnalysisPayload(sessionResult.value.journey);

  let text: string;
  try {
    text = await callGpt(buildMoodAnalysisUserMessage(payload));
  } catch {
    await markJobFailed(service, jobId, "AI 응답을 받지 못했습니다");
    return {
      ok: false,
      code: "AI_TIMEOUT",
      error: "AI 응답을 받지 못했습니다",
    };
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
      return {
        ok: false,
        code: "AI_TIMEOUT",
        error: "AI 응답을 받지 못했습니다",
      };
    }
    parsed = parseMoodAnalysis(text);
  }

  if (!parsed.ok) {
    await markJobFailed(service, jobId, "무드 프로파일 생성에 실패했습니다");
    return {
      ok: false,
      code: "GENERATION_FAILED",
      error: "무드 프로파일 생성에 실패했습니다",
    };
  }

  const { error: updateError } = await service
    .from("moodboard_generation_jobs")
    .update({
      mood_profile: parsed.value,
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId);

  if (updateError) {
    return { ok: false, code: "GENERATION_FAILED", error: updateError.message };
  }

  return { ok: true, value: { jobId, moodProfile: parsed.value } };
}
