// API 요청/응답 공용 타입 + 에러 code union. 서버·클라이언트 공유. (docs/convention/error.md, api.md)

export type ApiErrorCode =
  | "INVALID_INPUT"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "AI_TIMEOUT"
  | "GENERATION_FAILED"
  | "INTERNAL_ERROR";

export type ApiSuccess<T> = { data: T };
export type ApiError = { error: { code: ApiErrorCode; message: string } };
