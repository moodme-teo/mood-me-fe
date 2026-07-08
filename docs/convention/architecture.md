# 아키텍처

무드미의 전체 구조와 세 가지 핵심 흐름. 폴더별 역할은 [folder-structure.md](./folder-structure.md), 세부 규칙은 [convention 문서들](./README.md) 참고.

## 레이어

```
Browser (Client Components — 상호작용·캔버스·폴링)
    ↓
App Router (src/app — 라우팅·Server Components)
    ↓
Route Handlers / Server Actions (검증 → 서비스 호출)
    ↓
lib/ (elice · fal · supabase 래퍼 — 서버 전용)
    ↓
외부 서비스 (Elice AX · Supabase)
```

의존 방향은 항상 한쪽: **lib/types/hooks → components → app**. 역방향 import는 ESLint로 차단합니다.

## 데이터 흐름 (일반)

- 읽기: Server Component가 Supabase에서 직접 조회 → props로 전달.
- 쓰기: 클라이언트 → Route Handler(또는 Server Action) → Zod 검증 → Supabase. 응답은 `{ data }` / `{ error: { code, message } }` — [convention/api.md](./convention/api.md).
- URL이 진실의 원천: `sessionId`, `moodboardId`, 문항 번호는 라우트 파라미터/쿼리에서 읽습니다 — [convention/state.md](./convention/state.md).

## AI 흐름

```
테스트 답변(MoodTestAnswer[])
  → POST /api/generation-jobs            # Route Handler
  → Elice AX GPT-5 (답변 → 이미지 프롬프트 + 키워드 9개 + 무드 프로파일)   # lib/elice-ai.ts
  → Elice AX Gemini (프롬프트 → base image, 실시간 미리보기)      # lib/elice-ai.ts
  → Supabase Storage 업로드 → Moodboard 레코드 생성
  → 클라이언트는 job 상태 폴링 (queued → processing → completed | failed)
```

모든 AI 호출은 실패를 전제로 설계합니다(타임아웃·재시도·폴백) — [convention/ai.md](./convention/ai.md).

## Canvas 흐름

```
MoodboardElement[] (직렬화 가능한 상태 — 진실의 원천)
  → react-konva 렌더 (Stage > Layer)      # components/canvas — 격리 구역
  → 편집 (스티커/펜/텍스트, selection, undo = 상태 조작)
  → exportImage() → PNG dataURL (pixelRatio 2)
  → Supabase Storage 업로드 → 공유
```

Konva 노드는 렌더 결과물일 뿐, 저장·undo는 전부 `MoodboardElement[]` 데이터를 조작합니다 — [convention/canvas.md](./convention/canvas.md).
