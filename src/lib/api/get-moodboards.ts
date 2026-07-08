import { apiClient } from "@/lib/api-client";
import type { MoodboardSummary } from "@/lib/moodboard/summary";
import { moodboardSummariesSchema } from "@/lib/moodboard/summary";

type GetMoodboardsInput = {
  guestSessionId?: string | null;
};

export async function getMoodboards(input: GetMoodboardsInput = {}) {
  const searchParams = new URLSearchParams();
  if (input.guestSessionId) {
    searchParams.set("guestSessionId", input.guestSessionId);
  }

  const path = searchParams.size
    ? `/api/moodboards?${searchParams.toString()}`
    : "/api/moodboards";
  return moodboardSummariesSchema.parse(
    await apiClient.get<MoodboardSummary[]>(path),
  );
}
