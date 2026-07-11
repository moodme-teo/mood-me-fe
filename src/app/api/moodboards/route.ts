import { apiError, apiSuccess } from "@/lib/api-response";
import { getMoodboardSummaries } from "@/lib/moodboard/list";

// 요청자 신원은 쿠키에서만 읽는다 — 예전에는 ?guestSessionId= 로 받아 남의 목록을 그대로
// 조회할 수 있었고, 게스트 id가 주소창·서버 로그에 노출됐다 (#126).
export async function GET() {
  const result = await getMoodboardSummaries();

  if (!result.ok) {
    return apiError("INTERNAL_ERROR", result.error, 500);
  }

  return apiSuccess(result.value);
}
