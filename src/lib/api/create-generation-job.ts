import { z } from "zod";

import { apiClient } from "@/lib/api-client";

export const createGenerationJobResponseSchema = z.object({
  jobId: z.string().min(1),
});

export type CreateGenerationJobResponse = z.infer<
  typeof createGenerationJobResponseSchema
>;

// 완료된 테스트 세션의 여정을 AI로 해석해 보드를 조립하는 job을 시작한다 (#36/#37).
// jobId만 즉시 돌아오고, 실제 분석·조립은 서버에서 백그라운드로 이어진다 — 진행 상황은
// getGenerationJob으로 폴링한다.
export function createGenerationJob(sessionId: string) {
  return apiClient.post<CreateGenerationJobResponse>(
    `/api/mood-test-sessions/${sessionId}/generate`,
  );
}
