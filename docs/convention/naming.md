# Naming Convention

> 베이스: [bulletproof-react — Project Standards](https://github.com/alan2207/bulletproof-react/blob/master/docs/project-standards.md) + [toss frontend-fundamentals](https://frontend-fundamentals.com) 가독성·예측 가능성 규칙. 도메인 용어는 [glossary.md](./glossary.md)가 원천.

## 파일 · 폴더명

| 대상                         | 규칙              | 예                                                           |
| ---------------------------- | ----------------- | ------------------------------------------------------------ |
| 컴포넌트 파일                | PascalCase.tsx    | `BoardCanvas.tsx`, `QuestionCard.tsx`                        |
| 훅 파일                      | `use` + camelCase | `useGenerationJob.ts`                                        |
| 그 외 모듈 (lib/utils/types) | lowercase(-kebab) | `anthropic.ts`, `api-client.ts`, `mood-test.ts`              |
| 폴더 · 라우트 폴더           | kebab-case        | `components/mood-test/`, `app/test/[session-id]/generating/` |

- ESLint `check-file` 룰로 강제합니다(후속 이슈) — 컴포넌트 파일만 PascalCase, 나머지는 kebab-case 패턴.

## 식별자

| 대상                 | 규칙              | 예                                       |
| -------------------- | ----------------- | ---------------------------------------- |
| 컴포넌트             | PascalCase        | `BoardCanvas`, `QuestionCard`            |
| 훅                   | `use` + camelCase | `useGenerationJob`                       |
| 이벤트 핸들러 (내부) | `handle` + 동사   | `handleSubmit`, `handleStickerDrop`      |
| 이벤트 props         | `on` + 동사       | `onSubmit`, `onSelect`                   |
| 불리언               | `is/has/can` 접두 | `isGenerating`, `hasAnswered`, `canUndo` |
| 상수                 | UPPER_SNAKE_CASE  | `CLAUDE_MODEL`, `EXPORT_PIXEL_RATIO`     |
| 타입                 | PascalCase        | `Moodboard`, `MoodTestAnswer`            |

## 도메인 용어사전

- 도메인 개념의 영단어는 [glossary.md](./glossary.md)에 등록된 것만 씁니다. **같은 개념에 새 이름을 만들지 않습니다.** 새 개념 → glossary에 먼저 등록 → 코드에 사용.

## toss 규칙 — 이름으로 가독성 만들기

- **복잡한 조건에 이름 붙이기**: 조건식이 한눈에 안 읽히면 변수나 함수로 추출합니다.

```ts
// ❌ 조건을 머릿속에서 해석해야 함
if (job.status === "completed" && job.resultMoodboardId && !isExpired(session)) { … }

// ✅ 이름이 의미를 말함
const canShowResult = job.status === "completed" && job.resultMoodboardId && !isExpired(session);
if (canShowResult) { … }
```

- **매직 넘버에 이름 붙이기**: 출처가 있는 숫자는 상수로 (`const KEYWORD_COUNT = 9`, `const EXPORT_PIXEL_RATIO = 2`).
- **이름 겹치지 않게 관리하기**: 같은 이름이 다른 동작을 하면 안 됩니다. 라이브러리를 감싼 모듈이 원본과 같은 이름을 쓰지 않습니다 (예: fetch 래퍼는 `fetch`가 아니라 `apiClient`).
- **숨은 로직 드러내기**: 이름에 없는 부수효과를 함수에 숨기지 않습니다. `getMoodboard()`가 로깅·상태 변경까지 하면 안 됩니다 — 이름과 파라미터·반환값만 보고 동작을 예측할 수 있어야 합니다.
