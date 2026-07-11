import { apiClient } from "@/lib/api-client";

export type CreateExportUploadUrlResponse = {
  path: string;
  token: string;
};

export function createExportUploadUrl(
  moodboardId: string,
  kind: "export" | "base" = "export",
) {
  return apiClient.post<CreateExportUploadUrlResponse>(
    `/api/moodboards/${moodboardId}/export-upload-url`,
    { kind },
  );
}
