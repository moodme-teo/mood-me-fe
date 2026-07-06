---
todo: a29
role: PM
type: chore
title: 엘리스 API 신청
page: 공통
schedule: 26.07.06~26.07.06
issue: 9
output: none
---

## 📋 개요

무드보드 AI 생성 파이프라인(PRD 9)에 사용할 이미지 생성 API 키를 확보해야 함. 엘리스 측 API 사용 신청이 선행되어야 빌더의 생성 기능 구현(a13)과 fal/anthropic 연동(`src/lib/fal.ts`, `src/lib/anthropic.ts`)이 막히지 않는다.

## ✅ 작업 내용

- [ ] 엘리스 API 사용 신청 제출
- [ ] 발급받은 키를 팀 공유 (보안 채널로, 레포에 커밋 금지)
- [ ] `.env.local` 키 이름 규약 정리 후 메인테이너에게 전달 (a24 API 키/비밀 관리와 연계)

## 🎯 완료 조건

- API 키가 발급되어 팀원 전원이 로컬 `.env.local`에 설정할 수 있다.

## 🔗 참고

- `docs/work/todo/a29-elice-api-request.md`
- docs/prd/mood-me-prd.md — 9. AI 생성 파이프라인 / 13. Open Questions #4
