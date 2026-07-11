# Error Convention

> 베이스: [bulletproof-react — Error Handling](https://github.com/alan2207/bulletproof-react/blob/master/docs/error-handling.md). 사용자 플로우별 처리는 PRD §10을 따릅니다.

## Error Code

- 에러 `code`는 `types/api.ts`에서 union 타입 한 곳으로 관리합니다:
  `INVALID_INPUT | UNAUTHORIZED | NOT_FOUND | AI_TIMEOUT | GENERATION_FAILED | …`
- 이 union이 클라이언트 분기와 사용자 문구 매핑의 기준입니다. **사용자에게 raw 에러 메시지를 노출하지 않습니다** — code → 브랜드 톤의 문구 매핑을 거칩니다.
- Route Handler는 try/catch로 감싸고 `{ error: { code, message } }`로 응답. 원본 에러는 서버 로그로만.

## API 에러는 한 곳에서 (interceptor)

- 클라이언트 API 에러 처리는 `lib/api-client.ts`에 모읍니다: `{ error }` 응답 파싱 → 타입 있는 에러로 변환 → 공통 처리(토스트 트리거, `UNAUTHORIZED` 시 로그인 유도). 컴포넌트마다 개별 try/catch로 흩어놓지 않습니다.

## Error Boundary / error.tsx

- 앱 전체에 하나가 아니라 **영역별로** 둡니다 — 한 영역의 에러가 앱 전체를 무너뜨리지 않게:
  - 라우트 세그먼트: `error.tsx`(런타임 에러) · `not-found.tsx`(404) · 최상위 `global-error.tsx`
  - 생성 플로우(`/test/[id]/generating`)는 전용 에러 UI(재시도 버튼) 필수

## AI 실패 처리

- AI 호출은 실패한다는 전제로 구현합니다 — **타임아웃 + 사용자 폴백까지 만들어야 구현 완료**입니다. 세부는 [ai.md](./ai.md).
- 생성 실패 → 재시도 UI, 편집 저장 실패 → 로컬 임시 저장 + 토스트, 로그인 실패 → 토스트 후 복귀 (PRD §10).

## Toast 규칙

- 토스트는 **사용자가 조치할 수 있거나 알아야 하는 실패**에만. 성공 알림 남발 금지.
- 문구는 code 매핑에서 — 컴포넌트에 하드코딩하지 않습니다.
- 같은 에러의 중복 토스트 금지 (interceptor에서 dedupe).

## Retry

- 자동 재시도는 서버(AI 파이프라인)에서 1회 — [ai.md](./ai.md). 클라이언트는 자동 재시도하지 않고 **사용자에게 재시도 버튼**을 줍니다.
- 에러를 조용히 삼키지 않습니다 — 보여주거나(토스트/재시도 UI) 최소한 `console.error`.

## Error Tracking

- 프로덕션 에러는 수집합니다 — PostHog error tracking(이미 연동)을 사용. 새 도구를 추가하지 않습니다.
