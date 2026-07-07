# Type Convention

> 베이스: [bulletproof-react — Project Standards](https://github.com/alan2207/bulletproof-react/blob/master/docs/project-standards.md)(TypeScript) + [toss frontend-fundamentals](https://frontend-fundamentals.com) 예측 가능성 규칙.

## 기본

- `strict: true` 유지. **`any` 금지** — 불가피하면 `unknown` + narrowing. `as` 캐스팅은 이유 주석 필수.
- **`type`으로 통일** (interface 대신). 선언 병합이 필요한 예외 상황에만 interface.
- 리팩토링 시 타입 선언부터 고치고 타입 에러를 따라가며 수정합니다 — 타입이 리팩토링의 안전망입니다.

## 타입의 위치

| 타입 | 위치 |
| --- | --- |
| 공용 도메인 타입 (`Moodboard`, `MoodTestAnswer` …) | `src/types/` 도메인별 파일 — PRD §7 기준 |
| DB 스키마 타입 | `src/types/database.ts` — **`supabase gen types typescript` 생성물.** 손으로 재정의 금지 |
| API 요청/응답 타입 + 에러 code union | `src/types/api.ts` — 서버·클라이언트 공유 |
| feature 전용 타입 | `features/<도메인>/types/` |
| 컴포넌트 하나만 쓰는 props | 그 파일 안에 인라인 |

## Zod가 타입의 원천

- 런타임 경계(API 요청/응답, Claude 출력)를 넘는 데이터는 **Zod 스키마를 먼저 정의**하고 타입은 `z.infer`로 뽑습니다 — 스키마와 타입이 어긋날 수 없게:

```ts
const createJobSchema = z.object({ testSessionId: z.string().uuid() });
type CreateJobInput = z.infer<typeof createJobSchema>;
```

- 스키마는 요청 선언 파일에 콜로케이션 ([api.md](./api.md)), AI 출력 스키마는 [ai.md](./ai.md).

## toss 규칙 — 같은 종류의 함수는 반환 타입 통일

- 같은 계열의 함수·훅은 반환 형태를 통일합니다. 어떤 fetcher는 `data`를, 어떤 fetcher는 `{ data, error }`를 반환하면 쓰는 쪽이 매번 열어봐야 합니다.
  - fetcher: 성공 시 파싱된 `data` 반환, 실패 시 throw (api-client가 보장)
  - 검증 함수: `{ ok: true, value } | { ok: false, error }` 형태의 discriminated union으로 통일
