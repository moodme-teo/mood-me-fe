import { z } from "zod";

import {
  moodboardElementSchema,
  moodProfileSchema,
} from "@/lib/api/get-moodboard";
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
  // 서버(getLatestGenerationJob)는 이미 이 값을 내려주고 있었다 — 클라이언트 타입에
  // 없어서 못 읽었을 뿐이다. 저장 직전 최신 job을 재조회할 때(MoodboardCropEditor) 이
  // 값을 쓴다(#125) — 편집 화면 렌더 시점의 스냅샷이 그 사이 끝난 리포트를 놓치지 않도록.
  moodProfile: moodProfileSchema.nullable(),
});

export type GenerationJob = z.infer<typeof generationJobSchema>;

// 세션의 최신 생성 job을 조회한다 — 재시도 시 새 job이 생기므로 항상 "최신"을 본다(#37).
export function getGenerationJob(sessionId: string) {
  return apiClient.get<GenerationJob>(
    `/api/mood-test-sessions/${sessionId}/generation-job`,
  );
}
