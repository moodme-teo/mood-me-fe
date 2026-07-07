# 폴더 구조

> [bulletproof-react의 Project Structure](https://github.com/alan2207/bulletproof-react/blob/master/docs/project-structure.md)의 배치 원칙(콜로케이션·단방향 의존·경계 린트)을 채택하되, 폴더는 현재 구조(`components/<도메인>`)를 유지합니다. 별도 `features/` 폴더는 두지 않습니다.

## 전체 구조

```
src/
├── app/                  # 라우팅 전용 — page/layout/route/error/loading 파일과 globals.css만
│   └── api/              # Route Handlers (route.ts)
├── components/
│   ├── ui/               # 도메인 무관 프리미티브 (Button, Card, Dialog …) — DESIGN.md 토큰 기반
│   ├── canvas/           # Konva 격리 구역 (특수 규칙) → convention/canvas.md
│   ├── mood-test/        # 추구미 테스트 도메인 컴포넌트
│   ├── board/            # 무드보드 도메인 컴포넌트
│   └── …                 # 도메인 단위로 폴더 추가
├── hooks/                # 공용 커스텀 훅 — 2곳 이상에서 쓰일 때 승격
├── lib/                  # 외부 서비스 래퍼 + 서버/공용 유틸
│   ├── anthropic.ts  fal.ts  prompts.ts       # 서버 전용
│   ├── supabase/                              # client.ts(브라우저) · server.ts(서버 전용)
│   ├── api-client.ts                          # 클라이언트 fetch wrapper
│   └── api/                                   # 요청 선언 (도메인별 파일) → convention/api.md
├── types/                # 공용 타입 (database.ts, api.ts, 도메인 타입)
└── proxy.ts              # Supabase 세션 갱신 (middleware 아님 — Next 16)
```

## 배치 규칙

1. **콜로케이션**: 코드는 쓰이는 곳 가까이 둡니다. 한 라우트에서만 쓰는 컴포넌트는 라우트 폴더 안 `_components/`(私 폴더 — 라우팅 제외)도 허용, 2곳 이상이면 `components/<도메인>/`으로. 성급한 공용화 금지.
2. **단방향 의존**: `lib/types/hooks → components → app` 방향으로만 import 합니다.
   - `app/`은 어디서든 가져올 수 있음
   - `components/`는 lib/types/hooks에서만 가져옴
   - `lib/`·`types/`는 components/app을 알지 못함
3. **도메인 컴포넌트 폴더 간 직접 import는 최소화** — 조합이 필요하면 `app/`(페이지) 레벨에서 조합합니다. `ui/`는 누구나 가져다 씁니다.
4. **배럴 파일(index.ts) 금지** — 트리셰이킹을 방해합니다. 파일을 직접 import 합니다. **유일한 예외: `components/canvas/index.ts`** (SSR 격리 래핑 목적 — convention/canvas.md).
5. import는 항상 절대 경로 `@/*` (`@/components/board/...`). `../../..` 금지.

## ESLint 강제 (후속 이슈)

핵심 경계는 문서가 아니라 [bulletproof-react의 `import/no-restricted-paths` zones](https://github.com/alan2207/bulletproof-react/blob/master/docs/project-structure.md)로 강제합니다:

```js
'import/no-restricted-paths': ['error', { zones: [
  // Konva 격리: canvas 내부 파일은 밖에서 직접 import 금지 (배럴 index.ts만 허용)
  // 서버 전용 lib(anthropic/fal/supabase-server/prompts)은 클라이언트 구역에서 import 금지
  // 단방향: lib/types는 components/app을 모름
  { target: ['./src/lib', './src/types'], from: ['./src/components', './src/app'] },
]}]
```

> 원본은 구형 `.eslintrc` 포맷이므로 이 레포의 flat config(`eslint.config.mjs`)로 번역해서 적용합니다. 서버 전용 lib 유출은 `server-only` 패키지가 빌드 타임에 한 번 더 막습니다.
