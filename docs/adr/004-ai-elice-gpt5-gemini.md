# 004. AI — Elice AX 프록시(GPT-5 텍스트 + Gemini 2.5 Flash Image 이미지)

- 상태: 채택
- 날짜: 2026-07-08
- 이전: supersedes [002](./002-ai-claude-haiku-fal-flux.md)

## 맥락

002에서 채택한 Claude Haiku(텍스트) + fal.ai Flux schnell(이미지) 조합을 팀 계약/과금 사정으로 Elice AX 프록시 경유 모델로 교체하기로 했다. 프록시가 OpenAI 호환 엔드포인트(`/chat/completions`, `/images/generations`)를 제공해 두 역할 모두 하나의 프록시·인증 체계로 통일할 수 있다.

## 결정

- 텍스트 변환(여정 → 무드 프로파일): **Elice AX 프록시의 GPT-5** (`openai/gpt-5`, OpenAI 호환 `/chat/completions`)
- 이미지 생성: **Elice AX 프록시의 Gemini 2.5 Flash Image** (`google/gemini-2.5-flash-image`, OpenAI 호환 `/images/generations`) — 상세: [moodboard-library-collection.md](../work/todo/moodboard-library-collection.md)

## 근거

- 두 모델 모두 같은 Elice 프록시(`https://api-cloud-function.elice.io/v1`)와 API 키(`ELICE_MODEL_API_KEY`)로 접근 — 키·과금 관리를 한 곳으로 모은다
- OpenAI 호환 엔드포인트라 `openai` SDK 하나로 두 역할 모두 처리 가능 (base URL만 프록시로 지정)
- 002의 속도·비용 우선순위(Haiku 선택 근거)는 유지하고 싶었지만, 팀 계약상 Elice 프록시 경유가 사실상 유일한 선택지라 모델 등급보다 프록시 제약이 우선한다. GPT-5는 이 작업(구조화된 텍스트 변환)엔 과한 모델이지만 프록시가 제공하는 옵션 중 하나를 그대로 쓴다

## 결과

- 모델명·엔드포인트는 `lib/elice-ai.ts`(`GPT_MODEL`) 상수로만 참조 — 교체는 한 곳 수정
- 키는 서버 전용(`server-only` 강제), 호출 규칙·재시도·폴백은 [convention/ai.md](../convention/ai.md)
- `lib/anthropic.ts`(Claude)·`lib/fal.ts`(fal.ai)·`@anthropic-ai/sdk`·`@fal-ai/client`는 이 결정으로 제거한다. 이미지 모델 상수(`google/gemini-2.5-flash-image`)는 이미지 생성(#37) 구현 시점에 `lib/elice-ai.ts`에 추가된다
