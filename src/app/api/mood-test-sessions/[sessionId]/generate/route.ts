import { after } from "next/server";

import { apiError, apiSuccess } from "@/lib/api-response";
import { getRequester } from "@/lib/auth/requester";
import {
  createGenerationJob,
  runGenerationPipeline,
} from "@/lib/mood-test/generate-mood-analysis";

const ERROR_STATUS = {
  NOT_FOUND: 404,
  GENERATION_FAILED: 502,
} as const;

// after()는 이 라우트의 maxDuration이 다 될 때까지만 서버리스 인스턴스를 살려둔다
// (node_modules/next/dist/docs/.../after.md — "after will run for the platform's
// default or configured max duration of your route"). 이 값이 없으면 플랫폼 기본
// 제한(대개 이미지·분석 실측 소요보다 훨씬 짧다)에서 runGenerationPipeline이 중간에
// 죽어, job이 status:"processing"에 영구히 멈추고 status_message도 못 남긴다 —
// 실제 프로덕션에서 재현됨. 이미지(90초×1재시도=180초)와 분석(120초×1재시도=240초)이
// 동시에 돌고 이 함수는 둘 다 끝나야 반환되므로(analysisSettled) 최소 240초보다
// 여유 있게 잡는다.
export const maxDuration = 300;

// PRD §8 — POST /mood-test-sessions/{id}/generate. job row만 만들고 즉시 jobId를 돌려준다 —
// 무거운 AI 분석·보드 조립은 after()로 응답 전송 후 백그라운드에서 이어간다. 클라이언트는
// 이 jobId로 GET .../generation-job을 폴링해 진행률을 본다(#37/#64).
//
// 이 세션에 진행 중인 job이 이미 있으면 createGenerationJob이 새로 만들지 않고 그 job을
// 돌려준다 — 그 경우 파이프라인은 이미 그 job을 위해 한 번 떠 있으므로 여기서 또 띄우면
// AI를 중복 호출하게 된다(#115). isNew일 때만 after()로 태운다.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params;

  // 소유자가 아니면 createGenerationJob이 NOT_FOUND로 막는다 — job row도, AI 호출도 없다.
  const requester = await getRequester();
  const result = await createGenerationJob(sessionId, requester);

  if (!result.ok) {
    return apiError(result.code, result.error, ERROR_STATUS[result.code]);
  }

  const { jobId, journey, isNew } = result.value;
  if (isNew) {
    after(() => runGenerationPipeline(jobId, journey));
  }

  return apiSuccess({ jobId }, isNew ? 201 : 200);
}
