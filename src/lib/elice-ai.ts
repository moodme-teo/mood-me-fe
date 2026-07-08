import "server-only";

import OpenAI from "openai";

// 서버 전용. API 라우트 안에서만 import 하세요 (ELICE_MODEL_API_KEY 노출 방지).
// Elice AX 프록시 — OpenAI 호환 엔드포인트로 텍스트·이미지 모델을 모두 서빙한다 (ADR 004).
//
// 클라이언트 생성을 지연시킨다 — Next.js는 Route Handler를 빌드 타임에 정적 분석하며
// 모듈을 import하는데, OpenAI SDK는 apiKey가 없으면 생성자에서 즉시 throw한다. 모듈
// 최상단에서 생성하면 env가 없는 빌드 환경(CI 등)에서 build 자체가 깨진다.
let client: OpenAI | null = null;

export function getEliceClient(): OpenAI {
  client ??= new OpenAI({
    apiKey: process.env.ELICE_MODEL_API_KEY,
    baseURL: process.env.ELICE_BASE_URL,
  });
  return client;
}

// 여정 → 무드 프로파일 변환용.
export const GPT_MODEL = "openai/gpt-5";

// 보드 히어로 컷 생성용 (#37). 실측 스펙: docs/work/todo/moodboard-library-collection.md
// — aspect_ratio 파라미터는 무시되고 항상 1024×1024로 반환된다.
export const GEMINI_IMAGE_MODEL = "google/gemini-2.5-flash-image";
