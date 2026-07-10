import { after } from "next/server";

import { apiError, apiSuccess } from "@/lib/api-response";
import { getRequester } from "@/lib/auth/requester";
import { runMoodboardAnalysisRetry } from "@/lib/mood-test/generate-mood-analysis";
import { startMoodboardAnalysisRetry } from "@/lib/moodboard/retry-analysis";

const ERROR_STATUS = {
  NOT_FOUND: 404,
  GENERATION_FAILED: 502,
} as const;

// PRD §5.6·§10.3 — 결과 페이지 "분석 다시 시도". 이미지·저장·공유는 이미 정상 동작 중이고
// 사용자가 잃은 건 해석뿐이라, 이 라우트는 moodboards.mood_profile·analysis_status만
// 건드린다 — 이미지·elements·exported_image_data_url은 절대 손대지 않는다(#122).
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ moodboardId: string }> },
) {
  const { moodboardId } = await params;

  const requester = await getRequester();
  const result = await startMoodboardAnalysisRetry(moodboardId, requester);

  if (!result.ok) {
    return apiError(result.code, result.error, ERROR_STATUS[result.code]);
  }

  const { journey, alreadyRunning } = result.value;
  if (!alreadyRunning) {
    after(() => runMoodboardAnalysisRetry(moodboardId, journey));
  }

  return apiSuccess({ analysisStatus: "processing" as const });
}
