import "server-only";

import { getEliceClient, GPT_IMAGE_MODEL } from "@/lib/elice-ai";

// quality=medium 기준 실측 40~70초(1024x1536 보드 크기). high는 118초라 재시도까지
// 감안하면 예산을 넘긴다 — 실측: docs/work/todo/moodboard/moodboard-creation.md
const IMAGE_TIMEOUT_MS = 90_000;
const IMAGE_SIZE = "1024x1536"; // 세로 2:3 — 보드 출력 고정값(moodboard-creation.md §비율 매핑)

// moodboard-creation.md 실측 주의사항:
// ① urllib 기본 UA는 Cloudflare 1010 차단 → 브라우저 UA 헤더 필요
// ② response_format을 보내면 400 Unknown parameter — b64_json이 기본 응답이라 아예 안 보낸다
// ③ size=1024x1536 + quality=high는 프록시가 503(backend_error)을 낸다 → medium 고정
// ④ 간헐적 5xx(빈 응답) → 1회 재시도
const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

async function callImageModel(prompt: string): Promise<string> {
  const response = await getEliceClient().images.generate(
    {
      model: GPT_IMAGE_MODEL,
      prompt,
      size: IMAGE_SIZE,
      quality: "medium",
    },
    {
      timeout: IMAGE_TIMEOUT_MS,
      headers: { "User-Agent": BROWSER_USER_AGENT },
    },
  );

  const b64 = response.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error("이미지 생성 응답에 b64_json이 없습니다");
  }
  return `data:image/png;base64,${b64}`;
}

// 보드 이미지 1장을 생성해 data URL로 반환한다. 큐레이션 타일·Konva 조립 없이 이 이미지
// 하나가 곧 보드 전체다(moodboard-creation.md §보드 이미지 생성 흐름). 실패 시 1회
// 재시도(같은 문서 "간헐적 5xx → 재시도" 실측 근거) — 그래도 실패하면 호출부가 job을
// failed로 처리한다.
export async function generateBoardImage(prompt: string): Promise<string> {
  try {
    return await callImageModel(prompt);
  } catch {
    return await callImageModel(prompt);
  }
}
