# 001. 캔버스 라이브러리 — Konva/react-konva

- 상태: 채택
- 날짜: 2026-07-01

## 맥락

무드보드 편집(베이스 이미지 위에 펜/스티커/텍스트를 얹고 PNG로 내보내기)이 제품의 핵심 기능. 3인 · 6일 MVP라 학습 비용이 낮고 React와 자연스럽게 붙는 캔버스 라이브러리가 필요했다.

## 결정

**Konva + react-konva**를 사용한다.

## 근거

- **react-konva** — 캔버스 노드를 React 컴포넌트로 선언할 수 있어 상태(`MoodboardElement[]`) → 렌더 흐름이 React 멘탈 모델 그대로 유지됨
- 드래그/변형(Transformer)/레이어/`toDataURL` 내보내기가 내장 — MVP 요구사항을 추가 구현 없이 커버
- 대안 비교:
  - **Fabric.js** — 기능은 풍부하나 React 바인딩이 비공식이고 명령형 API 중심이라 상태 동기화 코드가 늘어남
  - **순수 Canvas API** — 6일 안에 selection/변형/undo까지 직접 구현하는 건 비현실적
  - **SVG/DOM 기반** — 펜 드로잉·이미지 합성·픽셀 내보내기에 불리

## 결과

- Konva는 SSR 불가 → `components/canvas/` 격리 구역 + 배럴에서 `dynamic(ssr: false)` 래핑, `next.config.ts` `serverExternalPackages` 지정
- 세부 규칙은 [convention/canvas.md](../convention/canvas.md) — 직렬화 데이터가 진실의 원천, Layer 3단 구조, export 규격
