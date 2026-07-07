import type { ApiError, ApiSuccess } from "@/types/api";

export class ApiClientError extends Error {
  code: ApiError["error"]["code"];
  status: number;

  constructor(code: ApiError["error"]["code"], message: string, status: number) {
    super(message);
    this.name = "ApiClientError";
    this.code = code;
    this.status = status;
  }
}

export async function apiClient<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  const payload = (await response.json()) as ApiSuccess<T> | ApiError;

  if (!response.ok || "error" in payload) {
    const error =
      "error" in payload
        ? payload.error
        : {
            code: "INTERNAL_ERROR" as const,
            message: "요청을 처리하지 못했어요.",
          };
    throw new ApiClientError(error.code, error.message, response.status);
  }

  return payload.data;
}
