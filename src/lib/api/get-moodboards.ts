import { apiClient } from "@/lib/api-client";
import type { MoodboardSummary } from "@/lib/moodboard/summary";
import { moodboardSummariesSchema } from "@/lib/moodboard/summary";

// 신원은 브라우저가 쿠키로 자동으로 실어 보낸다 — 게스트 id를 쿼리스트링에 담지 않는다 (#126).
export async function getMoodboards() {
  return moodboardSummariesSchema.parse(
    await apiClient.get<MoodboardSummary[]>("/api/moodboards"),
  );
}
