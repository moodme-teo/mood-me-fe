import type { ApiErrorCode } from "@/types/api";

// 클라이언트 fetch wrapper 단일 인스턴스. 컴포넌트 안에서 생 fetch() 대신 이걸 거친다.
// (docs/convention/api.md) — {data}/{error} 파싱과 에러 변환을 한 곳에서 처리.

export class ApiClientError extends Error {
  code: ApiErrorCode;

  constructor(code: ApiErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init);
  const json = await res.json();

  if (!res.ok) {
    const { code, message } = json.error as {
      code: ApiErrorCode;
      message: string;
    };
    throw new ApiClientError(code, message);
  }

  return (json as { data: T }).data;
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "POST",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    }),
};
