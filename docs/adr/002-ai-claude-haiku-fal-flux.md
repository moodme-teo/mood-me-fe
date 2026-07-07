# 002. AI — Claude Haiku(텍스트) + fal.ai Flux schnell(이미지)

- 상태: 채택
- 날짜: 2026-07-01

## 맥락

파이프라인이 2단계다: ① 테스트 답변 → 이미지 프롬프트 + 키워드 9개 + 무드 프로파일(텍스트 변환), ② 프롬프트 → 무드보드 베이스 이미지(이미지 생성). 사용자가 기다리는 동안 "채워지는" 연출이 필요해 **속도가 품질만큼 중요**하다.

## 결정

- 텍스트 변환: **Anthropic Claude — `claude-haiku-4-5`** (`@anthropic-ai/sdk`)
- 이미지 생성: **fal.ai — Flux schnell** (`@fal-ai/client`)

## 근거

- **Haiku 선택** — 작업이 "구조화된 변환"(분류·요약·JSON 출력)이라 상위 모델의 추론력이 불필요. Haiku가 지연·비용에서 압도적으로 유리하고, 품질은 프롬프트+Zod 재시도로 보정 가능
- **Flux schnell 선택** — 수 초 내 생성되는 몇 안 되는 고품질 모델. fal.ai는 큐/실시간 이벤트 API가 있어 "실시간으로 채워지는" 연출(제품 북극성)에 직접 대응. 대안인 DALL·E/SD 계열 직접 호스팅은 속도 또는 운영 부담에서 탈락
- 두 서비스 모두 서버리스 API — 인프라 관리 없이 6일 MVP에 적합

## 결과

- 모델명은 `lib/anthropic.ts`(`CLAUDE_MODEL`) · `lib/fal.ts`(`FLUX_SCHNELL`) 상수로만 참조 — 교체는 한 곳 수정
- 키는 서버 전용(`server-only` 강제), 호출 규칙·재시도·폴백은 [convention/ai.md](../convention/ai.md)
