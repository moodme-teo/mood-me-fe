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
  // 플랫폼 레벨 에러(예: Vercel의 413 응답)는 우리 { error } 포맷이 아닌 HTML/텍스트로
  // 온다 — res.json()을 무조건 부르면 SyntaxError로 원인이 가려진다(#163).
  const contentType = res.headers.get("content-type") ?? "";
  const json = contentType.includes("application/json")
    ? await res.json()
    : null;

  if (!res.ok) {
    const parsedError = json?.error as
      { code: ApiErrorCode; message: string } | undefined;
    const { code, message } = parsedError ?? {
      code: "INTERNAL_ERROR" as ApiErrorCode,
      message: "요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.",
    };
    throw new ApiClientError(code, message);
  }

  return (json as { data: T }).data;
}

function withBody(method: string) {
  return <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path),
  post: withBody("POST"),
  patch: withBody("PATCH"),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
