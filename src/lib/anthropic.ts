import "server-only";

import Anthropic from "@anthropic-ai/sdk";

// 서버 전용. API 라우트 안에서만 import 하세요 (ANTHROPIC_API_KEY 노출 방지).
export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// 빠르고 저렴 — 테스트 답변 → 이미지 프롬프트 + 9개 키워드 + 무드 성향 변환용
export const CLAUDE_MODEL = "claude-haiku-4-5";
