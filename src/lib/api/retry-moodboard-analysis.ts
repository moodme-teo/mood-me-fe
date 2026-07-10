import { z } from "zod";

import { apiClient } from "@/lib/api-client";

export const retryMoodboardAnalysisResponseSchema = z.object({
  analysisStatus: z.literal("processing"),
});

export type RetryMoodboardAnalysisResponse = z.infer<
  typeof retryMoodboardAnalysisResponseSchema
>;

// 결과 페이지 "분석 다시 시도"(#122) — mood_profile·analysisStatus만 갱신한다. 이미지·저장·
// 공유는 이 호출과 무관하게 이미 정상 동작 중이다. 실제 GPT-5 호출은 서버가 after()로
// 백그라운드에 띄우므로 이 응답은 즉시 온다 — 완료 여부는 getMoodboard 폴링으로 확인한다.
export function retryMoodboardAnalysis(moodboardId: string) {
  return apiClient.post<RetryMoodboardAnalysisResponse>(
    `/api/moodboards/${moodboardId}/analysis`,
  );
}
