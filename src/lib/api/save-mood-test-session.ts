import { z } from "zod";

import { apiClient } from "@/lib/api-client";
import { journeySchema } from "@/lib/mood-test/journey";

// lib/mood-test/save-session.ts의 saveSessionRequestSchema와 같은 모양이지만, 그 파일은
// server-only라 클라이언트에서 import할 수 없다 — 여기서 별도로 선언한다.
export const saveMoodTestSessionRequestSchema = z.object({
  sessionId: z.uuid(),
  // 소유자(회원·게스트)는 서버가 쿠키로만 확인한다 — 본문으로 받지 않는다 (#126).
  journey: journeySchema,
});

export type SaveMoodTestSessionRequest = z.infer<
  typeof saveMoodTestSessionRequestSchema
>;

export type SaveMoodTestSessionResponse = { id: string; status: "completed" };

export function saveMoodTestSession(input: SaveMoodTestSessionRequest) {
  return apiClient.post<SaveMoodTestSessionResponse>(
    "/api/mood-test-sessions",
    input,
  );
}
