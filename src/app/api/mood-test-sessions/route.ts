import { apiError, apiSuccess } from "@/lib/api-response";
import {
  saveMoodTestSession,
  saveSessionRequestSchema,
} from "@/lib/mood-test/save-session";

// PRD §5.7 저장 원칙: 서버에는 완성본만 커밋한다. 진행 중 상태는 클라이언트가
// store/localStorage로만 관리하고(#35), 테스트 완료 시점에 이 엔드포인트를 한 번만 호출한다.
// sessionId는 클라이언트가 이미 /test/[sessionId]에서 쓰던 값을 그대로 넘긴다 — 세션 생성을
// 미리 요청하는 별도 호출은 없다.
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("INVALID_INPUT", "유효한 JSON body가 필요합니다", 400);
  }

  const parsed = saveSessionRequestSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues
      .map((issue) => issue.message)
      .join("; ");
    return apiError("INVALID_INPUT", message, 400);
  }

  const result = await saveMoodTestSession(parsed.data);
  if (!result.ok) {
    return apiError("INTERNAL_ERROR", result.error, 500);
  }

  return apiSuccess(result.value, 201);
}
