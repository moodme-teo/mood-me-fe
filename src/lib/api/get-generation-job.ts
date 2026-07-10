import { z } from "zod";

import { moodboardElementSchema } from "@/lib/api/get-moodboard";
import { apiClient } from "@/lib/api-client";

export const generationJobSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["queued", "processing", "completed", "failed"]),
  // 이미지 갈래(status)와 독립된 분석 갈래 — 편집 진입 여부는 status만 결정하고,
  // analysisStatus는 생성중 화면의 재시도가 분석을 다시 부를지 판단하는 데만 쓴다(#122).
  analysisStatus: z.enum(["queued", "processing", "completed", "failed"]),
  progressPercent: z.number().min(0).max(100),
  statusMessage: z.string().nullable(),
  elements: z.array(moodboardElementSchema),
  baseImageUrl: z.string().nullable(),
});

export type GenerationJob = z.infer<typeof generationJobSchema>;

// 세션의 최신 생성 job을 조회한다 — 재시도 시 새 job이 생기므로 항상 "최신"을 본다(#37).
export function getGenerationJob(sessionId: string) {
  return apiClient.get<GenerationJob>(
    `/api/mood-test-sessions/${sessionId}/generation-job`,
  );
}
