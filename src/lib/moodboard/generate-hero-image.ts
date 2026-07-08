import "server-only";

import { GEMINI_IMAGE_MODEL, getEliceClient } from "@/lib/elice-ai";

const IMAGE_TIMEOUT_MS = 30_000;

// moodboard-library-collection.md 실측 주의사항:
// ① urllib 기본 UA는 Cloudflare 1010 차단 → 브라우저 UA 헤더 필요
// ② aspect_ratio 파라미터는 무시되고 항상 1024×1024 정방으로 반환된다
// ③ 간헐적 500(NoneType parts, 빈 응답) → 1회 재시도
const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

async function callGemini(prompt: string): Promise<string> {
  const response = await getEliceClient().images.generate(
    {
      model: GEMINI_IMAGE_MODEL,
      prompt,
      response_format: "b64_json",
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

// 히어로 컷 1장을 생성해 data URL로 반환한다. 실패 시 1회 재시도(moodboard-library-collection.md
// "간헐적 500 → 재시도" 실측 근거) — 그래도 실패하면 호출부가 job을 failed로 처리한다.
export async function generateHeroImage(prompt: string): Promise<string> {
  try {
    return await callGemini(prompt);
  } catch {
    return await callGemini(prompt);
  }
}
