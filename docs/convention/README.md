# 컨벤션 (docs/convention)

무드미 팀의 작업 규칙 모음입니다. 유지보수(스위퍼 정리 작업)와 코드 리뷰 비용을 줄이는 것이 목적입니다.

**베이스**: 범용 규칙은 [bulletproof-react](https://github.com/alan2207/bulletproof-react)와 [toss frontend-fundamentals](https://frontend-fundamentals.com)를 채택했고, Canvas·AI는 무드미 고유 문서입니다.

## 워크플로우 컨벤션

| 문서                                                 | 내용                                                   | 상태    |
| ---------------------------------------------------- | ------------------------------------------------------ | ------- |
| [commit-convention.md](./commit-convention.md)       | 커밋 메시지 형식 (`<prefix> : <메시지>`, Husky로 강제) | ✅ 확정 |
| [branch-pr-convention.md](./branch-pr-convention.md) | 브랜치 전략(main/dev/feature) · 이슈/PR 컨벤션         | ✅ 확정 |

## 코드 컨벤션

| 문서                           | 내용                                                                       | 상태    |
| ------------------------------ | -------------------------------------------------------------------------- | ------- |
| [component.md](./component.md) | 배치(ui/도메인/canvas) · Server/Client · props · composition · import 규칙 | 🚧 초안 |
| [state.md](./state.md)         | 상태 5분류 · 언제 무엇을 쓰는가 · 라이브러리 도입 기준                     | 🚧 초안 |
| [api.md](./api.md)             | Route Handler/Server Action · 응답 포맷 · Zod · 요청 선언 · Query Key      | 🚧 초안 |
| [error.md](./error.md)         | Error Code · Boundary · AI 실패 · Toast · Retry · Tracking                 | 🚧 초안 |
| [naming.md](./naming.md)       | 파일명 · 식별자 · 용어사전 · toss 이름 규칙                                | 🚧 초안 |
| [type.md](./type.md)           | strict · any 금지 · 타입 위치 · Zod가 원천 · DB 타입                       | 🚧 초안 |
| [canvas.md](./canvas.md)       | 직렬화 데이터가 원천 · Konva 구조 · store · undo · export · 격리           | 🚧 초안 |
| [ai.md](./ai.md)               | Prompt · Model · Zod Output · Retry/Timeout · Streaming · Fallback         | 🚧 초안 |

> Style · Design System 컨벤션은 [DESIGN.md](../../DESIGN.md)의 `[담당자 결정]` 항목 확정 후 별도 작성합니다.

## 프로젝트 구조 문서

- [folder-structure.md](./folder-structure.md) — 폴더 구조와 배치 규칙 (bulletproof-react 채택)
- [architecture.md](./architecture.md) — 레이어 · 데이터/AI/Canvas 흐름
- [glossary.md](./glossary.md) — 도메인 용어사전

## 강제 로드맵 (Enforcement)

기계로 잡을 수 있는 규칙은 문서가 아니라 도구로 강제합니다. 문서는 판단이 필요한 것만 담습니다.

| 규칙                                                     | 도구                                                                          | 상태         |
| -------------------------------------------------------- | ----------------------------------------------------------------------------- | ------------ |
| 커밋 메시지 형식                                         | Husky `commit-msg` 훅                                                         | ✅ 적용됨    |
| import 규칙 (상대경로 금지 → `@/*` · 순서/정렬 · 확장자) | ESLint `eslint-plugin-import` + `no-restricted-imports` (`eslint.config.mjs`) | ✅ 적용됨    |
| 서버 코드 클라이언트 유출 차단                           | `server-only` — `lib/anthropic.ts` · `lib/fal.ts` · `lib/supabase/server.ts`  | 🔜 후속 이슈 |
| 폴더 경계 (단방향 · Konva 격리 · 서버 lib)               | ESLint `import/no-restricted-paths` zones                                     | 🔜 후속 이슈 |
| 파일명 규칙 (컴포넌트 PascalCase · 그 외 kebab)          | ESLint `check-file`                                                           | 🔜 후속 이슈 |
| 포맷 논쟁 제거                                           | Prettier                                                                      | 🔜 후속 이슈 |
| 커밋 시 자동 검사                                        | lint-staged (`pre-commit`: ESLint --fix + `tsc --noEmit`)                     | 🔜 후속 이슈 |
| PR 시 자동 검사                                          | GitHub Actions: lint → `tsc --noEmit` → `next build`                          | 🔜 후속 이슈 |

- 설정 견본: [bulletproof-react `apps/nextjs-app`](https://github.com/alan2207/bulletproof-react/tree/master/apps/nextjs-app) — 구형 `.eslintrc` 포맷이므로 이 레포의 flat config(`eslint.config.mjs`)로 번역해서 가져옵니다.
- 이 문서들의 규칙이 PR 리뷰에서 위반으로 잡히면, 그 사례를 해당 문서에 bad 예시로 추가해 문서를 키웁니다.

관련 문서:

- [docs/work/README.md](../work/README.md) — 이슈 → 구현 → PR → 머지 워크플로우와 스킬 사용법
- [PRODUCT.md](../../PRODUCT.md) / [DESIGN.md](../../DESIGN.md) — 제품 원칙과 디자인 시스템 (시드)
