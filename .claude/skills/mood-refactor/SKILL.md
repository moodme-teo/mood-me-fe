---
name: mood-refactor
argument-hint: "[대상 경로/파일 (선택) — 생략하면 dev 대비 브랜치 변경분 전체]"
description: 현재 브랜치가 dev 대비 바꾼 코드를 무드미 컨벤션(docs/convention) 기준으로 검토·리팩토링합니다. 기능 변경 없이 코드 품질만 개선 — 중복/하드코딩 제거, 공용 타입·유틸 정리, 컴포넌트 분리, use* 훅 추출, 타입 안정성, 네이밍, 컨벤션 정합성. 계획을 먼저 요약해 승인받은 뒤 적용하고, lint/typecheck/build/format으로 검증합니다. 커밋은 하지 않습니다(work-work 담당). PR 올리기 직전 정리에 사용합니다.
---

# /mood-refactor — 브랜치 변경분 컨벤션 리팩토링

현재 feature 브랜치가 `dev` 대비 바꾼 코드를 무드미 컨벤션 기준으로 검토하고, **기능 변경 없이 코드 품질만** 개선한다. **계획을 먼저 요약해 승인받은 뒤** 적용하고, 검증까지 돌린다. **커밋은 하지 않는다** — 커밋·PR은 `/work-work` 또는 사용자가 한다.

> 범용 `/simplify`·`/code-review`와의 차이: 이 스킬은 **무드미 컨벤션(`docs/convention/*`) 정합성**과 **이 레포의 실제 검증 명령**에 초점을 둔다. 규칙을 여기 나열하지 않고, 매번 해당 컨벤션 문서를 읽어 그 기준으로 검사한다(단일 출처 유지).

## 0. 사전 점검

```bash
git rev-parse --abbrev-ref HEAD      # 현재 브랜치
git fetch origin                     # dev 최신 반영
```

- 현재 브랜치가 **`dev` 또는 `main`이면 중단**: "리팩토링은 feature 브랜치에서 진행합니다. `/work-work`로 브랜치를 먼저 따세요."
- 대상 파일 목록을 확보한다:

```bash
git diff --name-only origin/dev...HEAD    # dev 대비 이 브랜치가 바꾼 파일
```

- **인자로 경로/파일이 오면** 그 범위로 좁힌다 (변경 파일과 교집합).
- 대상이 **0개**면 "dev 대비 변경된 코드가 없습니다." 안내 후 중단.
- 코드가 아닌 파일(문서 `.md`, 에셋 등)만 바뀌었으면 "리팩토링 대상 코드가 없습니다" 안내 후 중단.

## 1. 대상 파악 (레포 전체 탐색 금지)

- **변경 파일 + 그 파일이 직접 import하거나 그 파일을 직접 import하는 파일**까지만 읽는다. 무리하게 레포 전체를 탐색하지 않는다.
- 각 파일이 속한 **영역의 컨벤션 문서를 먼저 읽고** 그 기준으로 검사한다 (규칙을 이 스킬에 복붙하지 않는다):

  | 작업 영역 | 먼저 읽을 문서 |
  | --- | --- |
  | 컴포넌트 · `'use client'` · props · composition | `docs/convention/component.md` |
  | 타입 · `any` 금지 · Zod 원천 · 타입 위치 | `docs/convention/type.md` |
  | 상태 5분류 · 라이브러리 도입 기준 | `docs/convention/state.md` |
  | 에러 code · 토스트 · interceptor | `docs/convention/error.md` |
  | 파일명 · 식별자 · 조건 이름 붙이기 · 매직넘버 | `docs/convention/naming.md` |
  | API 응답 포맷 · Zod · Query Key | `docs/convention/api.md` |
  | Konva/canvas (배럴 예외·특수 규칙) | `docs/convention/canvas.md` |
  | Claude/fal.ai 호출 | `docs/convention/ai.md` |
  | 폴더 경계 · 단방향 · 배럴 금지 | `docs/convention/folder-structure.md` |

- ⚠️ 이 레포의 Next.js는 학습 데이터와 다르다. Next.js API를 손대야 하면 `AGENTS.md`대로 `node_modules/next/dist/docs/`의 관련 가이드를 먼저 읽는다.

## 2. 검토 범위

- 중복 제거
- 하드코딩(매직넘버 · 문구) 제거 → 상수화 / code 매핑
- 공용 타입 정리 (`src/types/` — 위치 규칙은 `type.md`)
- 공용 유틸 정리
- 컴포넌트 분리 (렌더 함수 중첩 → 컴포넌트 추출, props 과다 → composition)
- `use*` 커스텀 훅 추출
- TypeScript 타입 안정성 개선
- 네이밍 개선
- 컨벤션 정합성 확인

## 3. 작업 원칙

- **기능 동작을 변경하지 않는다.** UI/UX · 문구 · 디자인 · 라우팅은 의도 없이 바꾸지 않는다.
- **추상화는 "2회 이상 반복 + 의미가 명확"할 때만** (= `component.md` "2곳 이상일 때만 승격, 성급한 공용화 금지"). 공용화가 오히려 복잡도를 높이면 하지 않는다.
- **`any`로 우회하지 않는다** (= `type.md`). 불가피하면 `unknown` + narrowing, `as` 캐스팅은 이유 주석 필수.
- **불필요한 `useMemo` / `useCallback` / `memo`를 추가하지 않는다.**
- **상태 라이브러리를 선제 도입하지 않는다** — `state.md`의 도입 기준 신호 없이 Zustand/TanStack Query/React Hook Form을 넣지 않는다.
- 기존 **API 계약 · Supabase 스키마 · 라우트 구조를 바꾸지 않는다.** `src/types/database.ts`는 `supabase gen types` 생성물 — 손대지 않는다.
- **env 값 · API key · 비밀값은 절대 수정·노출하지 않는다.**
- 도구로 강제되는 규칙(import zones · `server-only` · 배럴 금지)을 어기는 리팩토링을 하지 않는다 — lint가 잡는다. `lib/anthropic.ts`·`lib/fal.ts`·`lib/supabase/server.ts`는 서버 전용, 클라이언트로 끌어오지 않는다.
- 큰 구조 변경은 하지 않고, 현재 브랜치 작업 범위 안에서 개선한다.

## 4. 계획 요약 → 승인 대기 (게이트)

- 발견한 문제와 바꿀 내용을 **파일별로 요약**해 보여준다.
- **승인 전에는 어떤 파일도 수정하지 않는다.** 사용자가 OK 하면 5단계로 진행한다.

## 5. 적용

- `type.md` 지침대로 **타입 선언부터 고치고 타입 에러를 따라가며** 수정한다 — 타입이 리팩토링의 안전망이다.
- 논리 단위로 정돈한다. **커밋은 하지 않는다.**

## 6. 검증

순서대로 실행하고, 실패하면 원인을 분석해 수정한다:

```bash
npm run lint          # eslint — import zones · server-only · 배럴 금지 포함
npm run typecheck     # tsc --noEmit
npm run build         # next build
npm run format:check  # prettier --check  (실패 시 npm run format)
```

## 7. 결과 보고

1. **발견한 코드 품질 문제**
2. **실제 수정한 내용** (파일별 · 이유)
3. **수정하지 않은 항목과 이유**
4. **영향받을 수 있는 기능**
5. **실행한 검증 명령과 결과**

> 이 스킬은 수정까지만 한다. 커밋·PR은 `/work-work` 또는 사용자가 직접 진행한다. `dev`/`main`에 직접 push하지 않는다.
