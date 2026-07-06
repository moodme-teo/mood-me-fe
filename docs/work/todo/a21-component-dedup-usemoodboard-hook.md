---
todo: a21
role: 스위퍼
type: refactor
title: 컴포넌트 중복 제거 + useMoodboard 훅 추출
page: 보드편집
schedule: 26.07.07~26.07.08
issue: 7
output: repo
---

## 📋 개요

Konva 편집기 정식화(a14)가 진행되면 캔버스 상태 로직(요소 추가/선택/삭제/순서, 저장)이 컴포넌트에 뒤섞이기 쉽다. 캔버스 로직을 `useMoodboard` 훅으로 추출하고 중복 컴포넌트를 정리해, 편집 화면(PRD 5.5)과 결과물 화면(PRD 5.6)이 같은 보드 상태를 공유할 수 있게 한다.

## ✅ 작업 내용

- [ ] `src/components/canvas/BoardCanvas.tsx` 등 캔버스 관련 컴포넌트의 상태 로직 파악
- [ ] 보드 상태·요소 조작(추가/선택/삭제/z-order)·저장 로직을 `useMoodboard` 훅으로 추출
- [ ] 중복 UI 컴포넌트 통합 (편집/결과물 화면 간 공유 가능한 단위로)
- [ ] 훅 추출 후 편집 플로우 회귀 확인 (도구별 추가·이동·삭제·저장)

## 🎯 완료 조건

- 캔버스 로직이 useMoodboard 훅 한 곳에 모이고, 컴포넌트는 렌더링에 집중한다.
- 편집 기능 동작에 회귀가 없다.

## 🔗 참고

- `docs/work/todo/a21-component-dedup-usemoodboard-hook.md`
- docs/prd/mood-me-prd.md — 5.5 무드보드 편집 / 7. MoodboardElement
- src/components/canvas/BoardCanvas.tsx
