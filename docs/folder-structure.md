# 폴더 구조

> [bulletproof-react의 Project Structure](https://github.com/alan2207/bulletproof-react/blob/master/docs/project-structure.md)를 그대로 채택하고, Next.js App Router와 무드미 도메인에 맞게 폴더만 조정했습니다.

## 전체 구조

```
src/
├── app/                  # 라우팅 전용 — page/layout/route/error/loading 파일과 globals.css만
│   └── api/              # Route Handlers (route.ts)
├── components/           # 도메인 무관 공용 컴포넌트
│   ├── ui/               # 프리미티브 (Button, Card, Dialog …) — DESIGN.md 토큰 기반
│   └── canvas/           # Konva 격리 구역 (특수 규칙) → convention/canvas.md
├── features/             # 도메인 기능 모듈 — 대부분의 코드가 여기 삽니다
│   ├── auth/             # 카카오 로그인 · 게스트 세션
│   ├── mood-test/        # 추구미 테스트 (문항, 답변 수집)
│   ├── generation/       # AI 생성 파이프라인 (Claude → fal.ai, job 폴링)
│   ├── board-editor/     # 무드보드 편집 (캔버스 조작 UI)
│   └── result/           # 보드완성 · 공유 · 내보내기
├── hooks/                # 공용 커스텀 훅 — 2개 이상 feature에서 쓰일 때 승격
├── lib/                  # 외부 서비스 래퍼 (anthropic.ts, fal.ts, supabase/, api-client.ts)
├── types/                # 공용 타입 (database.ts, api.ts, 도메인 타입)
├── config/               # env 파싱, 전역 상수
├── utils/                # 공용 순수 함수
└── proxy.ts              # Supabase 세션 갱신 (middleware 아님 — Next 16)
```

feature 폴더 이름은 초기 제안입니다. 페이지 라벨(로그인·테스트·보드생성·보드편집·보드완성)과 1:1로 대응하도록 팀이 확정합니다.

## feature 내부 구조

각 feature는 자기 코드만 담습니다. **필요한 폴더만** 만듭니다.

```
src/features/mood-test/
├── api/          # 이 feature의 요청 선언 (타입+스키마+fetcher — convention/api.md)
├── components/   # 이 feature 전용 컴포넌트
├── hooks/        # 이 feature 전용 훅
├── stores/       # 이 feature 전용 상태 (도입 시)
├── types/        # 이 feature 전용 타입
└── utils/        # 이 feature 전용 유틸
```

## 배치 규칙

1. **콜로케이션**: 코드는 쓰이는 곳 가까이 둡니다. 1곳에서만 쓰면 그 feature 안에, 2곳 이상이면 공용(`components/`, `hooks/`, `utils/`)으로 승격. 성급한 공용화 금지.
2. **단방향 의존**: `공용(components/hooks/lib/types/utils) → features → app` 방향으로만 import 합니다.
   - `app/`은 features와 공용에서 가져올 수 있음
   - `features/`는 공용에서만 가져올 수 있음
   - 공용은 features/app을 알지 못함
3. **feature 간 직접 import 금지**: feature끼리 조합이 필요하면 `app/`(페이지) 레벨에서 조합합니다.
4. **배럴 파일(index.ts) 금지** — 트리셰이킹을 방해합니다. 파일을 직접 import 합니다. **유일한 예외: `components/canvas/index.ts`** (SSR 격리 래핑 목적 — convention/canvas.md).
5. import는 항상 절대 경로 `@/*` (`@/features/mood-test/...`). `../../..` 금지.

## ESLint 강제 (후속 이슈)

위 2·3번은 문서가 아니라 [bulletproof-react의 `import/no-restricted-paths` zones 설정](https://github.com/alan2207/bulletproof-react/blob/master/docs/project-structure.md)으로 강제합니다:

```js
'import/no-restricted-paths': ['error', { zones: [
  // feature 간 직접 import 금지 (feature마다 한 줄)
  { target: './src/features/mood-test', from: './src/features', except: ['./mood-test'] },
  // 단방향: features는 app을 모름
  { target: './src/features', from: './src/app' },
  // 단방향: 공용은 features/app을 모름
  { target: ['./src/components', './src/hooks', './src/lib', './src/types', './src/utils'],
    from: ['./src/features', './src/app'] },
]}]
```

> 원본은 구형 `.eslintrc` 포맷이므로 이 레포의 flat config(`eslint.config.mjs`)로 번역해서 적용합니다.
