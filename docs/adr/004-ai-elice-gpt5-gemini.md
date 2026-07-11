# 004. AI — Elice AX 프록시(GPT-5 텍스트 + GPT-Image-2 이미지)

- 상태: 채택
- 날짜: 2026-07-08 (개정 2026-07-09 — 이미지 모델 Gemini 2.5 Flash Image → GPT-Image-2)
- 이전: supersedes [002](./002-ai-claude-haiku-fal-flux.md)

> 파일명(`...-gemini.md`)은 링크 호환을 위해 유지한다. 이미지 모델은 아래 §개정 참조.

## 맥락

002에서 채택한 Claude Haiku(텍스트) + fal.ai Flux schnell(이미지) 조합을 팀 계약/과금 사정으로 Elice AX 프록시 경유 모델로 교체하기로 했다. 프록시가 OpenAI 호환 엔드포인트(`/chat/completions`, `/images/generations`)를 제공해 두 역할 모두 하나의 프록시·인증 체계로 통일할 수 있다.

## 결정

- 텍스트 변환(여정 → 무드 프로파일): **Elice AX 프록시의 GPT-5** (`openai/gpt-5`, OpenAI 호환 `/chat/completions`)
- 이미지 생성: **Elice AX 프록시의 GPT-Image-2** (`openai/gpt-image-2`, OpenAI 호환 `/images/generations`) — 상세: [moodboard-creation.md](../work/todo/moodboard/moodboard-creation.md)
  - 최초 채택(2026-07-08)은 Gemini 2.5 Flash Image였다. 아래 §개정 참조

## 근거

- 두 모델 모두 같은 Elice 프록시(`https://api-cloud-function.elice.io/v1`)와 API 키(`ELICE_MODEL_API_KEY`)로 접근 — 키·과금 관리를 한 곳으로 모은다
- OpenAI 호환 엔드포인트라 `openai` SDK 하나로 두 역할 모두 처리 가능 (base URL만 프록시로 지정)

## 결과

- 모델명·엔드포인트는 `lib/elice-ai.ts`(`GPT_MODEL`·`GPT_IMAGE_MODEL`) 상수로만 참조 — 교체는 한 곳 수정
- 키는 서버 전용(`server-only` 강제), 호출 규칙·재시도·폴백은 [convention/ai.md](../convention/ai.md)
- `lib/anthropic.ts`(Claude)·`lib/fal.ts`(fal.ai)·`@anthropic-ai/sdk`·`@fal-ai/client`는 이 결정으로 제거한다

## 개정 — 이미지 모델 Gemini → GPT-Image-2 (2026-07-09)

이미지 생성 모델만 **`google/gemini-2.5-flash-image` → `openai/gpt-image-2`** 로 교체한다. 텍스트 모델·프록시·인증 체계는 그대로다.

**근거** (실측: [moodboard-creation.md](../work/todo/moodboard/moodboard-creation.md))

- Gemini는 `aspect_ratio`를 무시하고 항상 1024×1024 정방으로만 반환해 **보드 출력 비율(세로 2:3)을 만들 수 없었다.** gpt-image-2는 `size` 요청값을 그대로 반영한다 (16배수·최대 4K·종횡비 3:1 이내)
- 같은 프록시(`https://api-cloud-function.elice.io/v1`)·같은 키로 접근하므로 004의 통일 근거를 해치지 않는다

**따라오는 코드 변경**

- `GEMINI_IMAGE_MODEL` → `GPT_IMAGE_MODEL = "openai/gpt-image-2"` (`lib/elice-ai.ts`)
- 보드 이미지 생성(`lib/moodboard/generate-board-image.ts`): `response_format: "b64_json"` **제거**(gpt-image-2는 400 `Unknown parameter`, b64_json이 기본 응답) · 타임아웃 30초 → **90초**(medium 실측 40~70초) · `size: "1024x1536"`·`quality: "medium"` 명시
- 이미지 프롬프트는 GPT-5가 짓지 않는다. `computePersonaResult`(결정론적)의 비율 분포를 규칙 기반으로 조립한다(`lib/moodboard/build-board-prompt.ts`) — 큐레이션 타일·Konva 레이아웃 조립 대신 gpt-image-2 단일 호출로 보드 이미지 전체를 생성

**알려진 제약**

- `size=1024x1536` + `quality=high` 조합은 프록시가 503 `backend_error`를 낸다 (재현 3/3). `quality: "medium"` 으로 우회 중이며 Elice에 문의 대상
- 지연시간: `high` ≈ 118초 / `medium` ≈ 40~70초 — 타임아웃·재시도 예산을 이 폭에 맞춘다
