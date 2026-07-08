# Canvas Convention

> 무드미 고유 도메인 — 외부 레퍼런스 없이 이 문서가 원본입니다. 캔버스 흐름 개요는 [architecture.md](./architecture.md).

## Serializable Data가 진실의 원천

- 캔버스 상태의 원천은 Konva 노드가 아니라 **직렬화 가능한 `MoodboardElement[]`** (`pen | sticker | text`, PRD §7)입니다. Konva 노드는 그 데이터의 렌더 결과물일 뿐입니다.
- 저장·복원·undo·공유는 전부 이 배열을 다룹니다. **Konva 노드에서 상태를 역으로 읽어 저장하는 코드 금지** (드래그 종료 등 이벤트 시점에 데이터부터 갱신).
- 렌더 포맷과 저장 포맷을 분리하지 않습니다 — `MoodboardElement`가 곧 저장 포맷.

## Konva 구조

- Stage 아래 Layer는 역할별로 고정:
  1. **base layer** — Elice AX(Gemini) 생성 베이스 이미지 (편집 불가)
  2. **elements layer** — `MoodboardElement[]` 렌더 (펜/스티커/텍스트)
  3. **ui layer** — selection Transformer, 가이드 등 (export에서 제외)
- Layer를 임의로 늘리지 않습니다 (Layer 하나 = 캔버스 하나의 그리기 비용).

## Canvas Store

- 편집 상태(`elements`, `selectedId`, undo 스택)는 캔버스 격리 구역의 스토어에 모읍니다 — prop drilling 한계가 오면 Zustand 도입 1순위 후보 ([state.md](./state.md)).
- 컴포넌트가 Stage ref를 직접 만지지 않습니다 — 스토어/훅이 제공하는 액션(`addElement`, `updateElement`, `undo`, `exportImage`)만 사용.

## Selection / Undo

- 선택은 `selectedId` 하나로 관리, Transformer는 ui layer에서 해당 노드에 부착.
- undo는 **`elements` 배열 스냅샷 스택**으로 구현 (요소 추가/삭제/변형 완료 시점에 push, 상한 예: 30). Konva 노드 조작을 되돌리는 방식 금지.

## Import 금지 / SSR false

- Konva 관련 코드(`konva`, `react-konva` import)는 전부 `src/components/canvas/` 안에만. 항상 `'use client'`.
- 외부에서는 **배럴로만 import**: `import { BoardCanvas } from "@/components/canvas"` — 프로젝트 유일의 배럴 허용 예외입니다. SSR 격리(`next/dynamic` + `ssr: false`)가 배럴에 있고, `next.config.ts`의 `serverExternalPackages`와 세트입니다.
- Konva 타입은 `import type Konva from "konva"`로만 (값 import 시 SSR에서 터짐).
- 이 경계는 ESLint zones로 강제됩니다(`eslint.config.mjs`) — [folder-structure.md](./folder-structure.md).

## Export / 이미지 저장 규칙

- 내보내기는 `stage.toDataURL({ pixelRatio: EXPORT_PIXEL_RATIO })` — `exportImage()` 액션만 사용.
- 규격은 상수로 한 곳에: 기본 캔버스 360×640 (모바일 세로 9:16), `EXPORT_PIXEL_RATIO = 2` (공유 썸네일 720×1280).
- export 전에 ui layer(선택 표시 등)를 숨깁니다 — 결과물에 편집 UI가 찍히면 안 됩니다.
- 저장 흐름: dataURL → Supabase Storage 업로드 → URL을 `Moodboard`에 기록. dataURL을 DB에 직접 저장하지 않습니다.
