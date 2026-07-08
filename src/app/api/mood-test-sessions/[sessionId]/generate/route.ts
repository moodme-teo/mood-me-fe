import { apiError, apiSuccess } from "@/lib/api-response";
import { generateMoodAnalysis } from "@/lib/mood-test/generate-mood-analysis";

const ERROR_STATUS = {
  NOT_FOUND: 404,
  AI_TIMEOUT: 504,
  GENERATION_FAILED: 502,
} as const;

// PRD §8 — POST /mood-test-sessions/{id}/generate. 완료된 테스트 세션의 여정을 AI로
// 해석해 moodboard_generation_jobs row를 만들고 mood_profile까지 채운다(status: processing).
// 클라이언트는 응답의 jobId로 GET /generation-jobs/{id}를 폴링한다(#37/#64).
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params;

  const result = await generateMoodAnalysis(sessionId);

  if (!result.ok) {
    return apiError(result.code, result.error, ERROR_STATUS[result.code]);
  }

  return apiSuccess({ jobId: result.value.jobId }, 201);
}
