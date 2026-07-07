<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# 컨벤션

상세 규칙은 `docs/convention/` — **작업 영역에 해당하는 섹션을 먼저 읽고 구현하세요.**

- [code-convention.md](docs/convention/code-convention.md) — 폴더 구조 · Component/API/State/Canvas/AI/Style/Type/Naming/Error · 디자인 시스템
- [commit-convention.md](docs/convention/commit-convention.md) · [branch-pr-convention.md](docs/convention/branch-pr-convention.md)

절대 규칙 요약 (상세와 예외는 위 문서 기준):

- Claude(`lib/anthropic.ts`) · fal.ai(`lib/fal.ts`) · Supabase service role 코드는 **서버 전용** — 클라이언트 컴포넌트에서 import 금지
- Konva 코드는 `components/canvas/` 안에서만 — 외부에서는 배럴(`@/components/canvas`)로만 import
- 색·폰트는 `globals.css @theme` 토큰만 사용 — 임의값(`text-[#ab12cd]`) 금지
- 커밋 메시지: `<prefix> : <메시지>` (Husky가 강제)
