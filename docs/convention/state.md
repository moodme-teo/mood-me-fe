# State Convention

> 베이스: [bulletproof-react — State Management](https://github.com/alan2207/bulletproof-react/blob/master/docs/state-management.md). 상태를 하나의 저장소에 몰지 않고 **종류별로 나눠 각각 다른 도구로** 다룹니다.

## 상태 5분류 — 언제 무엇을 쓰는가

| 종류 | 무드미에서의 예 | 도구 |
| --- | --- | --- |
| **URL State** | `sessionId`, `moodboardId`, 문항 번호 | 라우트 파라미터 / searchParams |
| **Component State** | 입력값, 열림/닫힘, 호버 | `useState` / `useReducer` |
| **Application State** | 캔버스 편집 상태, 토스트 | Context+hooks → 한계 시 Zustand |
| **Server Cache State** | 생성 job 상태, 무드보드 데이터 | Server Component fetch → 필요 시 TanStack Query |
| **Form State** | 테스트 답변 입력, 커스텀 텍스트 | 제어 컴포넌트 → 복잡해지면 React Hook Form |

판단 순서: **URL에 담을 수 있으면 URL이 먼저다** → 컴포넌트 안에서 끝나면 local → 그 다음에야 상위 공유를 고민합니다. 상태는 필요한 곳에 최대한 가깝게 두고, 처음부터 전역화하지 않습니다.

## 규칙

- URL이 진실의 원천인 값은 상태로 복제하지 않습니다. 라우트에서 읽으세요.
- Component State는 컴포넌트 안에서 시작하고, 다른 곳에서 필요해질 때만 끌어올립니다. 독립적인 단순 상태는 `useState`, 한 액션이 여러 값을 갱신하면 `useReducer`.
- 서버 데이터 읽기는 Server Component에서 직접 fetch가 기본. 클라이언트 갱신이 필요한 곳(생성 job 폴링)만 클라이언트에서 처리합니다.
- 전역 스토어에 서버 데이터를 캐싱하지 않습니다 — 서버 캐시는 서버 캐시 도구(TanStack Query)의 일입니다.

## 라이브러리 도입 기준

현재 **아무것도 도입하지 않았습니다.** 아래 신호가 오면 팀 합의 후 도입하고, 그전까지 선제 도입도·개별 재구현 난립도 금지:

- **Zustand** ← 전역 클라이언트 상태(캔버스 편집 상태 등)가 prop drilling/Context 한계에 부딪힐 때. feature 전용 스토어는 `features/<도메인>/stores/`에 ([canvas.md](./canvas.md)의 Canvas Store가 1순위 후보)
- **TanStack Query** ← 클라이언트 폴링·캐싱·무효화가 2곳 이상 필요할 때 (예: job 폴링에 재시도·백오프·탭 전환 처리까지 붙을 때). 도입 시 Query Key 규칙은 [api.md](./api.md)
- **React Hook Form** ← 검증 필드가 많은 폼이 생길 때. 도입 시 필드 단위가 아니라 폼 단위 응집으로 (Zod resolver와 함께)
