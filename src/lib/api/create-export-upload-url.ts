import { apiClient } from "@/lib/api-client";

export type CreateExportUploadUrlResponse = {
  path: string;
  token: string;
};

export function createExportUploadUrl(moodboardId: string) {
  return apiClient.post<CreateExportUploadUrlResponse>(
    `/api/moodboards/${moodboardId}/export-upload-url`,
  );
}
