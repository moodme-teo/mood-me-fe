# AI Convention

> 무드미 고유 도메인 — 외부 레퍼런스 없이 이 문서가 원본입니다. AI 흐름 개요는 [architecture.md](./architecture.md), 실패 처리는 [error.md](./error.md).

## Model 선택

- 모델명은 항상 상수로 — 문자열 하드코딩 금지:
  - 텍스트: `lib/anthropic.ts`의 `CLAUDE_MODEL` (`claude-haiku-4-5` — 빠르고 저렴, 답변→프롬프트 변환용)
  - 이미지: `lib/fal.ts`의 `FLUX_SCHNELL`
- 모델 교체는 상수 한 곳 수정으로 끝나야 합니다.

## Prompt 구조 / 폴더

- **프롬프트는 코드에 인라인 금지** — `lib/prompts.ts`(추가 예정)에 모읍니다. 커지면 `lib/prompts/` 폴더로 분리.
- 프롬프트는 system(역할·출력 형식)과 user(테스트 답변 데이터) 파트를 분리한 **템플릿 함수**로 작성: `buildMoodboardPrompt(answers: MoodTestAnswer[])`.
- 프롬프트마다 버전 주석을 남기고, PRD 부록의 분석 프롬프트와 서로 가리키게 유지합니다 — 문서와 코드가 어긋나면 코드 기준으로 PRD를 갱신.

## Zod Output — 응답은 항상 구조화

- Claude 응답(이미지 프롬프트 + 키워드 9개 + 무드 프로파일)은 **구조화해서** 받습니다: tool use(JSON 강제) 또는 텍스트 응답을 **Zod 스키마로 파싱**. 응답 텍스트를 정규식으로 긁는 코드 금지.
- 출력 스키마는 프롬프트 옆에 콜로케이션 — 프롬프트가 바뀌면 스키마도 같이 바뀝니다. 타입은 `z.infer`로 ([type.md](./type.md)).

## Retry / Timeout

- Zod 파싱 실패 시 **서버에서 1회 재시도** (파싱 에러를 프롬프트에 포함해 재요청). 2회 실패 → `GENERATION_FAILED`.
- 모든 AI 호출에 타임아웃 설정 — 상수로 관리 (예: Claude 30s, fal.ai 60s). 초과 → `AI_TIMEOUT`.
- 클라이언트는 자동 재시도하지 않습니다 — 사용자에게 재시도 버튼 ([error.md](./error.md)).

## Streaming / 진행 표시

- 이미지 생성은 fal.ai 실시간 미리보기(스트리밍/큐 이벤트)를 활용해 **"채워지는" 과정을 보여줍니다** — 로딩은 기다림이 아니라 연출입니다 (DESIGN.md 북극성).
- 진행 상태는 `MoodboardGenerationJob`(`queued → processing → completed | failed`, `progress_percent`)으로 클라이언트에 노출 — 폴링 규칙은 [state.md](./state.md).

## Error / Fallback

- **생성 호출은 실패를 전제로 구현합니다 — 타임아웃 + 사용자 폴백(재시도 UI)까지 만들어야 구현 완료입니다.**
- 실패는 job의 `status: failed` + `status_message`로 기록하고, 에러 code(`AI_TIMEOUT`, `GENERATION_FAILED`)로 응답합니다.
- 부분 실패 정책: 키워드는 나왔는데 이미지가 실패하면 job은 `failed`로 처리하되 재시도 시 Claude 결과를 재사용할 수 있게 저장합니다.

## 보안 / env

- `ANTHROPIC_API_KEY`, `FAL_KEY`, `SUPABASE_SERVICE_ROLE_KEY`는 서버 전용 — **`NEXT_PUBLIC_` 접두 금지**, 클라이언트 번들에 절대 노출하지 않습니다.
- `lib/anthropic.ts` · `lib/fal.ts`는 클라이언트에서 import 금지 (`server-only`로 강제됨).
