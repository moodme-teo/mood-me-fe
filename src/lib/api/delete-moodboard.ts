import { apiClient } from "@/lib/api-client";

export type DeleteMoodboardResponse = {
  id: string;
  deleted: boolean;
};

export function deleteMoodboard(moodboardId: string) {
  return apiClient.delete<DeleteMoodboardResponse>(
    `/api/moodboards/${moodboardId}`,
  );
}
