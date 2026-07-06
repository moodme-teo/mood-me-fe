---
todo: a22
role: 그로워
type: feat
title: 공유 최적화 (OG 이미지, 인스타/카카오 공유)
page: 보드완성
schedule: 26.07.09~26.07.09
issue: 8
output: repo
---

## 📋 개요

결과물의 SNS 공유는 서비스의 자연 유입을 만드는 핵심 지표다(PRD 2. 목표, F-23). 공유 링크가 예쁘게 펼쳐지도록 무드보드별 OG 이미지를 만들고, 카카오톡/인스타그램 공유 동선을 붙인다.

## ✅ 작업 내용

- [ ] 결과물 페이지(`/moodboard/:moodboardId`)에 `generateMetadata`로 동적 OG 메타데이터 적용
- [ ] 무드보드별 OG 이미지 제공 — `opengraph-image` 파일 컨벤션(ImageResponse) 또는 저장된 보드 이미지 URL 활용 (node_modules/next/dist/docs/01-app/01-getting-started/14-metadata-and-og-images.md 참고)
- [ ] 카카오톡 공유 버튼 (Kakao JS SDK 공유 or 링크 공유)
- [ ] 인스타 공유 동선 (이미지 다운로드 → 스토리 업로드 안내) + 링크 복사
- [ ] 모바일에서 공유 플로우 확인 (PRD 11. 모바일 우선)

## 🎯 완료 조건

- 공유된 링크가 카카오톡에서 무드보드 OG 이미지와 함께 미리보기로 뜬다.
- 결과물 페이지에서 카카오 공유·링크 복사·이미지 저장이 모바일에서 동작한다.

## 🔗 참고

- `docs/work/todo/a22-share-optimization.md`
- docs/prd/mood-me-prd.md — 5.6 최종 결과물 / F-23, F-24 / 13. Open Questions #5
- node_modules/next/dist/docs/01-app/01-getting-started/14-metadata-and-og-images.md
