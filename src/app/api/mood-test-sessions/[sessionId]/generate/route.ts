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

// PRD §8 — POST /mood-test-sessions/{id}/generate. job row만 만들고 즉시 jobId를 돌려준다 —
// 무거운 AI 분석·보드 조립은 after()로 응답 전송 후 백그라운드에서 이어간다. 클라이언트는
// 이 jobId로 GET .../generation-job을 폴링해 진행률을 본다(#37/#64).
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

  const { jobId, journey } = result.value;
  after(() => runGenerationPipeline(jobId, journey));

  return apiSuccess({ jobId }, 201);
}
