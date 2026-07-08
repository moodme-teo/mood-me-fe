import { apiError, apiSuccess } from "@/lib/api-response";
import { getLatestGenerationJob } from "@/lib/mood-test/get-latest-generation-job";

// PRD §8 GET /generation-jobs/{id}에 대응 — 다만 클라이언트는 job id가 아니라 세션 id로
// 진행 상황을 이어본다(재시도 시 새 job이 생기므로 "이 세션의 최신 job" 조회가 자연스럽다).
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params;

  const result = await getLatestGenerationJob(sessionId);

  if (!result.ok) {
    return apiError("NOT_FOUND", result.error, 404);
  }

  return apiSuccess(result.value);
}
