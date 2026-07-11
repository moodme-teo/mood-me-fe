import { apiError, apiSuccess } from "@/lib/api-response";
import { getRequester } from "@/lib/auth/requester";
import { getLatestGenerationJob } from "@/lib/mood-test/get-latest-generation-job";
import { isMoodTestSessionOwner } from "@/lib/mood-test/session-owner";

// 소유자 확인 실패와 job 부재를 같은 문구로 답한다 — 세션의 존재 여부를 흘리지 않는다 (#126).
const NOT_FOUND_MESSAGE = "생성 job을 찾을 수 없습니다";

// PRD §8 GET /generation-jobs/{id}에 대응 — 다만 클라이언트는 job id가 아니라 세션 id로
// 진행 상황을 이어본다(재시도 시 새 job이 생기므로 "이 세션의 최신 job" 조회가 자연스럽다).
//
// 이 job에는 확언 문구·5축 벡터·키워드(mood_profile)와 생성된 보드 이미지가 실려 있다.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params;

  const requester = await getRequester();
  if (!(await isMoodTestSessionOwner(sessionId, requester))) {
    return apiError("NOT_FOUND", NOT_FOUND_MESSAGE, 404);
  }

  const result = await getLatestGenerationJob(sessionId);
  if (!result.ok) {
    return apiError("NOT_FOUND", result.error, 404);
  }

  return apiSuccess(result.value);
}
