import "server-only";

import OpenAI from "openai";

// 서버 전용. API 라우트 안에서만 import 하세요 (ELICE_MODEL_API_KEY 노출 방지).
// Elice AX 프록시 — OpenAI 호환 엔드포인트로 텍스트·이미지 모델을 모두 서빙한다 (ADR 004).
export const elice = new OpenAI({
  apiKey: process.env.ELICE_MODEL_API_KEY,
  baseURL: process.env.ELICE_BASE_URL,
});

// 여정 → 무드 프로파일 변환용. 이미지 모델 상수(google/gemini-2.5-flash-image)는 #37에서 추가.
export const GPT_MODEL = "openai/gpt-5";
