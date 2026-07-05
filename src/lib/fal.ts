import { fal } from "@fal-ai/client";

// 서버 전용. API 라우트 안에서만 import 하세요 (FAL_KEY 노출 방지).
fal.config({ credentials: process.env.FAL_KEY });

export { fal };

// Flux schnell — 초 단위 생성, "실시간으로 채워지는 미리보기" UX에 적합
export const FLUX_SCHNELL = "fal-ai/flux/schnell";
