# Component Convention

> 베이스: [bulletproof-react — Components And Styling](https://github.com/alan2207/bulletproof-react/blob/master/docs/components-and-styling.md) + [Project Structure](https://github.com/alan2207/bulletproof-react/blob/master/docs/project-structure.md). 폴더 배치는 [folder-structure.md](../folder-structure.md).

## 배치: ui / 도메인 / canvas

- `components/ui/` — 도메인 지식이 없는 프리미티브만 (Button, Card, Dialog …). 무드보드를 아는 컴포넌트는 여기 금지. 시각 규칙은 [DESIGN.md](../../DESIGN.md) 기준
- `components/<도메인>/` (`mood-test/`, `board/` …) — 도메인 컴포넌트. 대부분의 컴포넌트가 여기 삽니다
- `components/canvas/` — Konva 격리 구역. 특수 규칙 적용 → [canvas.md](./canvas.md)
- **콜로케이션**: 쓰이는 곳 가까이. 한 라우트 전용이면 라우트 폴더 안 `_components/`도 허용, 2곳 이상에서 쓰일 때만 승격 — 성급한 공용화 금지

## Server / Client Component

- **기본은 Server Component.** 상태·이벤트·브라우저 API가 필요할 때만 파일 최상단 `'use client'`
- `'use client'`는 잎(leaf)에 — 페이지·레이아웃 레벨에 붙이지 않습니다. 상호작용 부분만 클라이언트 컴포넌트로 쪼개서 내립니다
- 브라우저 전용 라이브러리(Konva)는 `next/dynamic` + `ssr: false` — canvas 배럴에만 존재 ([canvas.md](./canvas.md))

## 컴포넌트 작성 규칙

- **렌더 함수 중첩 금지** — UI 단위가 보이면 컴포넌트로 추출합니다:

```tsx
// ❌ 컴포넌트가 커지는 순간 통제 불능
function Board() {
  function renderStickers() { return <ul>…</ul>; }
  return <div>{renderStickers()}</div>;
}

// ✅ 별도 컴포넌트로 추출
function StickerList() { return <ul>…</ul>; }
function Board() { return <div><StickerList /></div>; }
```

- **props 수 제한** — props가 많아지면(대략 7개 이상) 컴포넌트를 쪼개거나 composition(children/slot)으로 전환합니다
- **Compound Pattern** — 한 컴포넌트가 여러 조립 가능한 부분으로 구성되면 `Dialog` + `Dialog.Title` + `Dialog.Actions`처럼 합성으로 풉니다. boolean props를 늘리는 것(`showTitle`, `hasFooter` …)보다 항상 우선
- **서드파티 컴포넌트는 감싸서 사용** — 외부 라이브러리 컴포넌트를 앱 곳곳에서 직접 쓰지 않고 `components/ui/`에서 한 번 감싸 우리 인터페이스로 노출합니다 (교체·수정이 한 곳으로 모임)
- 컴포넌트는 default export, props 타입은 `type Props = { … }`로 파일 안에 정의 (2곳 이상 공유되면 `types/`로 승격)

## Import 규칙

- 항상 절대 경로 `@/*` — `../../..` 금지
- **도메인 컴포넌트 폴더 간 직접 import 최소화** — 조합은 `app/`(페이지) 레벨에서. `ui/`는 누구나 사용
- **단방향**: lib/types/hooks → components → app. 역방향 금지 (ESLint zones로 강제 — [folder-structure.md](../folder-structure.md))
- 배럴 파일(index.ts) 금지 — 파일 직접 import. 예외는 `components/canvas/index.ts` 하나
