# API Convention

> 베이스: [bulletproof-react — API Layer](https://github.com/alan2207/bulletproof-react/blob/master/docs/api-layer.md). 엔드포인트 경로·이름은 PRD §8 REST 설계를 따릅니다.

## 서버: Route Handler / Server Action

- **비밀키를 쓰는 외부 호출(Claude · fal.ai · Supabase service role)은 반드시 서버에서** — Route Handler(`app/api/**/route.ts`) 또는 Server Action. `lib/anthropic.ts`, `lib/fal.ts`는 서버 전용, 클라이언트 import 금지
- 구분 기준: 클라이언트가 **폴링·재호출하는 리소스는 Route Handler**(생성 job 등), 폼 제출형 **단순 mutation은 Server Action** 허용. 같은 작업에 두 방식을 섞지 않습니다
- Route Handler는 얇게: 파싱 → Zod 검증 → 서비스 함수 호출 → 응답. 비즈니스 로직은 feature의 서버 코드/`lib/`에

## 응답 포맷 (통일)

- 성공: `{ data: … }` + 2xx
- 실패: `{ error: { code: string, message: string } }` + 적절한 HTTP status — code 목록은 [error.md](./error.md)

## Zod Validation

- 요청 body/query는 **Zod 스키마로 검증** — 실패는 `400` + `INVALID_INPUT`. 손으로 `typeof` 체크를 늘어놓지 않습니다
- 스키마가 타입의 원천: `z.infer<typeof schema>`로 타입을 뽑아 서버·클라이언트가 공유합니다 ([type.md](./type.md))

## 클라이언트: 요청 선언 방식

- **fetch wrapper 단일 인스턴스**: 모든 클라이언트 요청은 `lib/api-client.ts`를 경유 — base URL, `{ data }/{ error }` 파싱, 에러 변환을 한 곳에서. 컴포넌트 안에서 생 `fetch()` 금지
- **요청 선언은 즉석에서 만들지 않고 feature의 `api/` 폴더에 파일로 분리**해 export 합니다. 요청 하나당:
  1. 요청/응답 **타입과 Zod 스키마**
  2. api-client를 쓰는 **fetcher 함수**
  3. (TanStack Query 도입 후) fetcher를 소비하는 **훅**

```
src/features/generation/api/
├── create-generation-job.ts   # 스키마 + fetcher (+ 훅)
└── get-generation-job.ts
```

## Query Key (TanStack Query 도입 시)

- key는 요청 선언 파일 안에 상수로 콜로케이션: `['generation-jobs', jobId]` 형태의 배열, 리소스 복수형으로 시작
- 무효화는 key prefix 기준(`['generation-jobs']`) — 문자열 하드코딩으로 흩어놓지 않습니다
