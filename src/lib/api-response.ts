import { NextResponse } from "next/server";

import type { ApiErrorCode } from "@/types/api";

// Route Handler 응답 포맷 통일. (docs/convention/api.md, error.md)

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status });
}

export function apiError(code: ApiErrorCode, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}
