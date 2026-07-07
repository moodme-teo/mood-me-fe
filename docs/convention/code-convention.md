# 코드 컨벤션

> 🚧 **초안** — 팀 리뷰 후 확정합니다. 이견이 있는 항목은 PR 리뷰 코멘트로 남겨주세요.
>
> 3인 · 6일 MVP 기준으로 "지금 필요한 규칙"만 정합니다. 라이브러리 도입 등 무거운 결정은 필요가 증명될 때 팀 합의로 추가합니다.

## 0. 기준 스택

- **Next.js 16.2 (App Router) + React 19 + TypeScript strict** — ⚠️ 학습 데이터의 Next.js와 다릅니다. 코드 작성 전 `node_modules/next/dist/docs/`의 해당 가이드를 확인하세요 (`AGENTS.md` 지침).
  - 대표 차이: **`middleware.ts`는 deprecated → `proxy.ts`로 개명** (`src/proxy.ts`, `proxy` 함수 export). Supabase 세션 갱신도 proxy에서 처리합니다.
- Tailwind CSS v4 · Konva/react-konva · Anthropic SDK(Claude) · fal.ai(Flux) · Supabase
- import는 경로 별칭 `@/*` 사용 (`@/components/...`, `@/lib/...`)

## 1. 폴더 구조

```
src/
├── app/                  # 라우팅 전용 — page/layout/route/error/loading 파일만
│   └── api/              # Route Handlers (route.ts) — 외부 API 호출은 전부 여기서
├── components/
│   ├── ui/               # 도메인 무관 프리미티브 (Button, Card, ProgressBar …)
│   ├── canvas/           # Konva 캔버스 (client 전용 — index.ts 배럴로만 import)
│   ├── board/            # 무드보드 도메인 컴포넌트
│   └── art/              # 생성 이미지 표시/그리드 관련
├── hooks/                # 공용 커스텀 훅 (useXxx.ts) — 2곳 이상에서 쓰일 때 승격
├── lib/                  # 서버/공용 유틸 (anthropic.ts, fal.ts, supabase/, api.ts …)
├── types/                # 공용 도메인 타입 (moodboard.ts, mood-test.ts …)
└── proxy.ts              # Supabase 세션 갱신 (middleware 아님 — Next 16)
```

- `app/`에는 라우팅 파일만 둡니다. 페이지 전용 컴포넌트는 `components/<도메인>/`에 두고, 한 라우트에서만 쓰는 게 확실하면 라우트 폴더 안 `_components/`(私 폴더 — 라우팅 제외)도 허용합니다.
- 파일이 1곳에서만 쓰이면 가까이, 2곳 이상이면 공용 폴더로 — 성급한 공용화 금지.

## 2. Naming Convention

| 대상 | 규칙 | 예 |
| --- | --- | --- |
| 컴포넌트 파일 | PascalCase.tsx | `BoardCanvas.tsx`, `QuestionCard.tsx` |
| 훅 | `use` + camelCase | `useMoodboard.ts`, `useGenerationJob.ts` |
| lib/유틸 모듈 | lowercase(-kebab) | `anthropic.ts`, `fal.ts`, `api.ts` |
| 라우트 폴더 | kebab-case | `app/test/[session-id]/generating/` |
| 타입/인터페이스 | PascalCase | `Moodboard`, `MoodTestAnswer` |
| 상수 | UPPER_SNAKE_CASE | `CLAUDE_MODEL`, `FLUX_SCHNELL` |
| 불리언 | is/has/can 접두 | `isGenerating`, `hasAnswered` |

- **도메인 어휘는 PRD §7 데이터 모델을 따릅니다**: `Moodboard`, `MoodboardElement`, `MoodTestSession`, `MoodTestAnswer`, `MoodboardGenerationJob`, `GuestSession`. 같은 개념에 새 이름을 만들지 않습니다. 새 도메인 개념(예: 추구미 → mood/aesthetic)이 생기면 PRD에 영단어 매핑을 먼저 추가한 뒤 코드에 씁니다.
- 네이밍·가독성의 일반 기준은 [toss frontend-fundamentals](https://frontend-fundamentals.com)를 참고합니다 — 이 문서와 충돌하면 이 문서가 우선.

## 3. Component Convention

- **기본은 서버 컴포넌트.** 상태/이벤트/브라우저 API가 필요할 때만 파일 최상단에 `'use client'`.
- 브라우저 전용 라이브러리(Konva 등)는 **배럴에서 `next/dynamic` + `ssr: false`로 감쌉니다** — `components/canvas/index.ts` 패턴을 따르세요.
- 컴포넌트는 default export, props 타입은 인라인 정의 (여러 곳에서 쓰이면 `types/`로 승격).
- `components/ui/`에는 도메인 지식이 없는 프리미티브만 — 무드보드를 아는 컴포넌트는 `board/`로.

## 4. API Convention

- **외부 API 호출(Claude · fal.ai · Supabase service role)은 반드시 Route Handler(`app/api/**/route.ts`) 안에서.** `lib/anthropic.ts`, `lib/fal.ts`는 서버 전용 — 클라이언트 컴포넌트에서 import 금지 (파일 상단 주석으로 표시돼 있음).
- 엔드포인트 경로·이름은 PRD §8 REST 설계를 따릅니다 (`/api/mood-test-sessions`, `/api/generation-jobs/[id]`, `/api/moodboards/[id]` …).
- 응답 형식 통일:
  - 성공: `{ data: … }` + 2xx
  - 실패: `{ error: { code: string, message: string } }` + 적절한 HTTP status
- 요청 body/query 검증은 **Zod 스키마**로 합니다 (Route Handler 구현 시작 시 도입) — 검증 실패는 `400` + `{ error: { code: "INVALID_INPUT", … } }`. 손으로 `typeof` 체크를 늘어놓지 않습니다.
- 클라이언트에서의 fetch는 얇은 헬퍼(`lib/api.ts`, 추가 예정)를 경유해 응답 파싱/에러 변환을 한 곳에서 처리합니다.

## 5. State Convention

- **기본: `useState`/`useReducer` + props.** 트리 여러 단계에 공유가 필요하면 좁은 범위의 Context.
- 서버 데이터는 서버 컴포넌트에서 fetch가 기본. 생성 진행 상태(`/test/[id]/generating`)처럼 갱신이 필요한 곳만 클라이언트 폴링.
- URL이 진실의 원천인 값(sessionId, moodboardId, 문항 번호 등)은 상태로 복제하지 말고 라우트 파라미터/쿼리에서 읽습니다.
- 상태 관리 라이브러리는 **현재 도입하지 않습니다.** 아래 신호가 오면 팀 합의 후 도입하고, 그전까지는 선제 도입도·개별 재구현 난립도 금지:
  - 전역 클라이언트 상태(캔버스 편집 상태 등)가 prop drilling/Context 한계에 부딪히면 → **Zustand**
  - 클라이언트 폴링·캐싱·무효화가 2곳 이상 필요해지면(예: 생성 job 폴링에 재시도·백오프·탭 전환 처리까지 붙을 때) → **TanStack Query**

## 6. Canvas Convention

- Konva 관련 코드는 전부 `src/components/canvas/` 안에. 항상 `'use client'`.
- import는 반드시 배럴 경유: `import { BoardCanvas } from "@/components/canvas"` — Konva를 SSR에서 격리하는 `next/dynamic` 래핑이 배럴에 있습니다 (`next.config.ts`의 `serverExternalPackages`와 세트).
- 이미지 내보내기는 `stage.toDataURL({ pixelRatio: 2 })` — `BoardCanvas`의 `exportImage()` 패턴 사용.
- 기본 캔버스 크기 360×640 (모바일 세로 기준).
- Konva 타입은 `import type Konva from "konva"`로만 (값 import 시 SSR에서 터짐).
- 캔버스 요소 데이터는 `MoodboardElement` 타입(`pen | sticker | text`)으로 직렬화 — 렌더와 저장 포맷을 분리하지 않습니다.

## 7. AI Convention

- **텍스트(Claude)**: `lib/anthropic.ts` 싱글턴 + 모델 상수 `CLAUDE_MODEL`. 용도: 테스트 응답 → 이미지 프롬프트 + 키워드 9개 + 무드 프로파일.
- **이미지(fal.ai)**: `lib/fal.ts` 싱글턴 + 모델 상수 `FLUX_SCHNELL`.
- 모델명은 항상 상수로 — 문자열 하드코딩 금지.
- 프롬프트 템플릿은 `lib/prompts.ts`(추가 예정)에 모아 코드와 분리합니다. PRD 부록의 분석 프롬프트와 코드가 서로를 가리키게 유지합니다.
- **Claude 응답은 구조화해서 받습니다** — tool use(JSON 강제) 또는 Zod 파싱 + 실패 시 1회 재시도. 응답 텍스트를 정규식으로 긁는 코드 금지.
- **생성 호출은 실패를 전제로 구현합니다** — 타임아웃 설정 + 실패 시 사용자 폴백(§10, PRD §10 재시도 UI)까지 만들어야 구현 완료입니다.
- env: `ANTHROPIC_API_KEY`, `FAL_KEY`, `SUPABASE_SERVICE_ROLE_KEY`는 서버 전용 — **`NEXT_PUBLIC_` 접두 금지**, 클라이언트 번들에 절대 노출하지 않습니다.

## 8. Style Convention

- **Tailwind v4 유틸 클래스 인라인**이 기본. CSS Modules/styled-components 도입하지 않습니다.
- 디자인 토큰은 `src/app/globals.css`의 `@theme`에서만 정의 — 색/폰트를 클래스에 임의값(`text-[#ab12cd]`)으로 박지 않습니다. 토큰이 없으면 DESIGN.md 담당자와 정한 뒤 `@theme`에 추가.
- [DESIGN.md](../../DESIGN.md) 규칙 준수: **No-Slop**(보라→핑크 그라데이션·글라스모피즘 금지), **Readability-Wins**(본문 대비 4.5:1 이상), **One-Kicker**(습관성 아이브로/넘버링 금지).
- 조건부 클래스가 필요해지면 `clsx` + `tailwind-merge`를 합친 `cn()` 헬퍼 **하나**로 통일해 도입합니다 (현재 미도입 — 개별 유틸 난립 금지).

## 9. Type Convention

- 공용 도메인 타입은 `src/types/`에 도메인별 파일로: `moodboard.ts`(Moodboard, MoodboardElement), `mood-test.ts`(MoodTestSession, MoodTestAnswer), `generation.ts`(MoodboardGenerationJob) — PRD §7 데이터 모델 기준.
- DB 스키마 타입은 손으로 재정의하지 않습니다 — `supabase gen types typescript` 생성 타입(`types/database.ts`, 추가 예정)을 출처로 삼고, 도메인 타입은 그 위에 얹습니다.
- API 요청/응답 타입도 `types/`에 두고 Route Handler와 클라이언트가 같은 타입을 공유합니다.
- `strict: true` 유지. **`any` 금지** — 불가피하면 `unknown` + narrowing.
- 컴포넌트 하나만 쓰는 props 타입은 그 파일 안에 인라인.

## 10. Error Convention

- 라우트 세그먼트마다 필요한 곳에 App Router 파일 컨벤션 사용: `error.tsx`(런타임 에러), `not-found.tsx`(404), 최상위 `global-error.tsx`.
- Route Handler는 try/catch로 감싸고 §4의 `{ error: { code, message } }` 형식으로 응답 — 원본 에러는 서버 로그로만.
- 에러 `code`는 한 곳에서 union 타입으로 관리합니다 (`types/api.ts` 예정): `INVALID_INPUT | UNAUTHORIZED | NOT_FOUND | AI_TIMEOUT | GENERATION_FAILED | …` — 클라이언트 분기와 사용자 문구 매핑의 기준이 됩니다. 사용자에게 raw 에러 메시지를 노출하지 않습니다.
- 사용자 플로우 에러 처리는 PRD §10을 따릅니다: 생성 실패 → 재시도 UI, 편집 저장 실패 → 로컬 임시 저장 + 토스트, 로그인 실패 → 토스트 후 복귀.
- 에러를 조용히 삼키지 않습니다 — 사용자에게 보여주거나(토스트/재시도) 최소한 `console.error`.

## 11. Design System

- **[DESIGN.md](../../DESIGN.md)가 단일 원천입니다** (현재 시드 상태 — `[담당자 결정]` 항목은 UXUI Leader가 확정). 확정된 토큰은 `globals.css @theme`에 반영해 코드와 동기화합니다.
- 재사용 UI는 `components/ui/`에 쌓아 사실상의 컴포넌트 라이브러리로 관리 — 같은 모양을 두 번 만들지 않습니다.
- 프리미티브를 처음부터 다 만들 필요는 없습니다 — 필요 시 **shadcn/ui 패턴**(Radix 기반 코드를 복사해 소유, 스타일은 우리 `@theme` 토큰으로 전면 교체)을 허용합니다. 단 기본 룩을 그대로 쓰는 것은 금지 (No-Slop).
- 시그니처 컴포넌트(테스트 문항 카드, 실시간 생성 미리보기, 캔버스 컨트롤, 공유 CTA)는 DESIGN.md의 해당 섹션을 먼저 확인.
- 접근성은 [PRODUCT.md](../../PRODUCT.md) 기준: WCAG AA, 시맨틱 HTML(`a` vs `button`), AI 이미지에 의미 있는 `alt`, `prefers-reduced-motion` 대응.

## 12. 강제 방식 (Enforcement 로드맵)

기계로 잡을 수 있는 규칙은 문서가 아니라 도구로 강제합니다. 문서는 판단이 필요한 것만 담습니다.

| 규칙 | 도구 | 상태 |
| --- | --- | --- |
| 커밋 메시지 형식 | Husky `commit-msg` 훅 | ✅ 적용됨 |
| 서버 코드 클라이언트 유출 차단 (§4·§7) | `server-only` 패키지 — `lib/anthropic.ts`·`lib/fal.ts`·`lib/supabase/server.ts`에 `import "server-only"` | 🔜 후속 이슈 |
| 폴더 경계 (§6 Konva 격리, §4 서버 lib) | ESLint `import/no-restricted-paths` zones | 🔜 후속 이슈 |
| 포맷 논쟁 제거 | Prettier | 🔜 후속 이슈 |
| 커밋 시 자동 검사 | lint-staged (`pre-commit`: ESLint --fix + `tsc --noEmit`) | 🔜 후속 이슈 |
| PR 시 자동 검사 | GitHub Actions: lint → `tsc --noEmit` → `next build` | 🔜 후속 이슈 |

- 설정 견본: [bulletproof-react `apps/nextjs-app`](https://github.com/alan2207/bulletproof-react/tree/master/apps/nextjs-app) — 단, 구형 `.eslintrc` 포맷이므로 이 레포의 flat config(`eslint.config.mjs`)로 번역해서 가져옵니다.
- 이 문서의 규칙이 PR 리뷰에서 위반으로 잡히면, 그 사례를 해당 섹션에 bad 예시로 추가해 문서를 키웁니다.

## 참고 레퍼런스

- [bulletproof-react](https://github.com/alan2207/bulletproof-react) — 폴더 구조 · 상태 계층 분류 · 경계 린트의 베이스
- [toss frontend-fundamentals](https://frontend-fundamentals.com) — 네이밍 · 가독성 기준
- [DESIGN.md](../../DESIGN.md) / [PRODUCT.md](../../PRODUCT.md) — 스타일 · 디자인 시스템 · 접근성의 단일 원천
- Canvas(§6) · AI(§7)는 무드미 고유 도메인 — 외부 레퍼런스 없이 이 문서가 원본입니다.
