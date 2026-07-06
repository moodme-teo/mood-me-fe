---
todo: a20
role: 스위퍼
type: refactor
title: 하드코딩 제거 및 공용 타입/유틸 정리
page: 공통
schedule: 26.07.07~26.07.08
issue: 6
output: repo
---

## 📋 개요

프로토타입(한 페이지 하드코딩 관통, a9)이 OK 판정을 받은 뒤 빌더가 화면을 분리하며 기능을 붙이는 동안, 스위퍼는 빌드를 뒤따라가며 하드코딩된 값·중복 정의를 공용 타입/유틸로 걷어낸다. 기술 부채를 스프린트 중반에 정리해 7/9 이후 버그픽스·디자인 다듬기가 수월해지게 한다.

## ✅ 작업 내용

- [ ] 하드코딩된 문자열/상수(질문 데이터, 상태 메시지, 경로 등)를 상수/설정 파일로 분리
- [ ] 중복 정의된 타입을 `src/types/`로 모아 공용화 (PRD 7 데이터 모델 기준: Moodboard, MoodTestAnswer 등)
- [ ] 공용 로직을 `src/lib/`로 정리 (Supabase·fal·anthropic 클라이언트 사용부 포함)
- [ ] lint/typecheck 통과 확인

## 🎯 완료 조건

- 화면 코드에 도메인 상수·타입의 중복 정의가 없고, types/·lib/에서 import해 쓴다.
- 기존 기능 동작에 회귀가 없다 (빌드·주요 플로우 확인).

## 🔗 참고

- `docs/work/todo/a20-remove-hardcoding-types-utils.md`
- docs/prd/mood-me-prd.md — 7. 데이터 모델
- src/lib/ (supabase, fal, anthropic)
