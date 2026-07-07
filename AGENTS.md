<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# mood-me

테스트 답변을 Claude(텍스트)와 fal.ai(이미지)로 **나만의 AI 무드보드**로 바꿔 Konva 캔버스에서 꾸미고 SNS에 공유하는 웹 경험. Next.js 16 App Router · React 19 · TS · Tailwind v4 · Supabase. 제품/디자인 배경: `PRODUCT.md` / `DESIGN.md`.

# 컨벤션 — 구현 전 반드시 읽기

**코드를 쓰기 전, 작업 영역에 해당하는 컨벤션 문서를 먼저 읽으세요.** 상세 규칙은 이 파일에 없습니다.

- 인덱스: [docs/convention/README.md](docs/convention/README.md)
- 영역별: [component](docs/convention/component.md) · [state](docs/convention/state.md) · [api](docs/convention/api.md) · [error](docs/convention/error.md) · [naming](docs/convention/naming.md) · [type](docs/convention/type.md) · [canvas](docs/convention/canvas.md) · [ai](docs/convention/ai.md)
- 구조: [docs/convention/folder-structure.md](docs/convention/folder-structure.md) · [docs/convention/architecture.md](docs/convention/architecture.md) · [docs/convention/glossary.md](docs/convention/glossary.md)

## 절대 규칙

1. Claude(`lib/anthropic.ts`) · fal.ai(`lib/fal.ts`) · Supabase service role 코드는 **서버 전용** — 클라이언트 컴포넌트에서 import 금지
2. Konva 코드는 `components/canvas/` 안에서만 — 외부에서는 배럴(`@/components/canvas`)로만 import
3. import는 절대 경로 `@/*` + 단방향(lib/types → components → app). **배럴 파일 금지** (canvas 예외)
4. 커밋 메시지: `<prefix> : <메시지>` (Husky가 강제)

# 워크플로우

이슈 기반으로 일합니다 — `/work-issue`(명세 작성 + 이슈 등록) → `/work-work`(이슈 선택 → dev 기준 feature 브랜치 → 구현 → 컨벤션 커밋 → PR) → 리뷰 → `/work-done`(squash-merge + 이슈 종료). `dev`/`main`에 직접 push하지 않습니다. 상세: [docs/work/README.md](docs/work/README.md).
