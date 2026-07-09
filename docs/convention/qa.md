# QA Convention

> 무드미 고유 문서 — E2E 하네스의 실제 코드는 `e2e/`, CI 정의는 `.github/workflows/ci.yml` 입니다.
> 캔버스 규칙은 [canvas.md](./canvas.md), AI 실패 처리는 [ai.md](./ai.md) · [error.md](./error.md).

## 목적

무드미의 **핵심 여정**(홈 → 추구미 테스트 → 생성중 → 결과물 → 공유)이 PR·배포 과정에서 조용히 깨지지 않도록 막는다.

이 하네스는 커버리지를 올리는 장치가 아니라 **최소 안전장치**다. PRODUCT.md의 성공 지표는 "결과물을 실제로 공유하는 것"이고, 그 경로 위의 화면만 지킨다. 그 밖의 화면은 깨져도 테스트가 잡지 못하며, 그래도 된다.

세 가지를 지킨다.

1. **테스트를 위해 UI/UX를 바꾸지 않는다.** 제품이 테스트에 맞추는 게 아니라 테스트가 제품에 맞춘다.
2. **E2E에서 실제 AI API를 호출하지 않는다.** 비용·비결정성·시크릿 관리 모두 이유다.
3. **느린 테스트는 만들지 않는다.** 전체 E2E가 로컬에서 10초대를 넘기면 아무도 안 돌린다.

## 테스트 레이어

아래에서 위로 갈수록 느리고 비싸다. **아래 레이어가 잡을 수 있는 건 위에서 잡지 않는다.**

| 레이어                | 도구                  | 명령                   | 언제 돌아가나             | 상태      |
| --------------------- | --------------------- | ---------------------- | ------------------------- | --------- |
| **Lint**              | ESLint (flat config)  | `npm run lint`         | 저장 시 · pre-commit · CI | ✅ 적용됨 |
| **Format**            | Prettier              | `npm run format:check` | 저장 시 · pre-commit · CI | ✅ 적용됨 |
| **Typecheck**         | `tsc --noEmit`        | `npm run typecheck`    | CI                        | ✅ 적용됨 |
| **Unit test**         | Vitest                | —                      | —                         | 🔜 보류   |
| **Build**             | `next build`          | `npm run build`        | CI                        | ✅ 적용됨 |
| **E2E**               | Playwright            | `npm run e2e`          | CI · 필요할 때 로컬       | ✅ 적용됨 |
| **Visual regression** | Playwright screenshot | —                      | —                         | 🔜 보류   |

로컬 저장·커밋 시에는 lint/format만 돈다(lint-staged, 스테이징된 파일만). 전체 검사는 CI가 한다 — **커밋은 빠르게 유지한다.**

### Unit test를 아직 넣지 않은 이유

지금 순수 로직이 얇다. 규칙 대신 **도입 조건**을 적어 둔다. 아래 중 하나라도 해당하면 Vitest를 붙인다.

- `useMoodboard`의 undo 스택처럼 **분기가 많고 UI 없이 검증 가능한 로직**이 생겼을 때
- `mood-test-flow`의 화면 전이 규칙이 E2E로 확인하기엔 조합이 너무 많아졌을 때
- Zod 스키마와 서버 응답이 어긋나 같은 버그가 두 번 났을 때

경계는 명확하다. `useMoodboard.ts`는 Konva를 import하지 않으므로 jsdom에서 테스트할 수 있고, `BoardCanvas.tsx`는 import하므로 못 한다. **Konva를 건드리는 순간 그건 E2E의 몫이다.**

### Visual regression을 아직 넣지 않은 이유

무드보드는 AI 생성 이미지 위에 Konva가 그린 캔버스다. 스크린샷 비교는 폰트 렌더링·GPU·타이밍 차이로 쉽게 깨진다. 도입한다면 **고정 mock 이미지 + `reducedMotion` + 마스킹**을 전제로, 결과물 페이지 한 장부터 시작한다. 전면 도입은 하지 않는다.

## e2e 폴더 구조

```txt
e2e/
├─ fixtures/
│  └─ data.ts               고정 테스트 데이터 (id, mock 무드보드, job 팩토리)
├─ pages/
│  ├─ home.page.ts          화면별 locator + 조작
│  ├─ mood-test.page.ts
│  ├─ generating.page.ts
│  ├─ edit.page.ts
│  └─ moodboard-result.page.ts
├─ utils/
│  ├─ mock-api.ts           page.route 기반 API mock
│  └─ session.ts            sessionStorage 시드 (스플래시 skip 등)
├─ home.spec.ts             시나리오
├─ mood-test.spec.ts
├─ generating.spec.ts
├─ edit.spec.ts             생성 직후 편집 (보류)
├─ moodboard-edit.spec.ts   저장본 재편집
└─ moodboard-result.spec.ts
```

배럴(`index.ts`)은 만들지 않는다 — [AGENTS.md](../../AGENTS.md) 절대 규칙 3. spec이 필요한 page object를 직접 import한다.

`@/*` 별칭은 `./src/*`만 가리키므로 `e2e/` 내부는 상대경로를 쓴다(ESLint에 예외 등록됨).

## `*.spec.ts` vs `*.page.ts`

**spec은 "무엇을 검증하는가", page는 "어떻게 조작하는가".** spec에 CSS 셀렉터가 등장하면 그건 page로 갈 코드다.

| 항목      | `*.spec.ts`                             | `*.page.ts`                                 |
| --------- | --------------------------------------- | ------------------------------------------- |
| 담는 것   | 시나리오, `expect` 단언                 | locator, 조작 메서드, 화면 고유 지식        |
| 금지      | 셀렉터 문자열, `page.locator(...)`      | `expect` 단언 (대기 목적의 `expect`는 예외) |
| 읽는 사람 | "이 화면은 무엇을 보장하나"를 알고 싶은 | "이 버튼을 어떻게 찾나"를 알고 싶은         |

```ts
// bad — spec이 셀렉터를 안다
await page.locator('button[aria-pressed="false"]').first().click();
await expect(page.locator('p[role="status"]')).toContainText("1 / 12 선택됨");

// good — spec은 의도만 말한다
await moodTest.pickOne();
await expect(moodTest.selectionStatus).toContainText("1 / 12 선택됨");
```

**page object는 처음부터 만든다.** "반복될 때만"으로 미루면 셀렉터가 spec 여기저기 박힌 뒤에야 옮기게 된다.

화면이 가진 **비직관적인 사실은 page object에 주석으로 남긴다.** 그 사실을 알아야 하는 사람이 읽을 자리가 거기다. 예: 생성중 화면의 진행률이 서버 값이 아니라는 사실은 `generating.page.ts`의 `readPercent()` 위에 있다.

## fixtures 사용 기준

`fixtures/`에는 **데이터만** 둔다. 동작하는 코드는 `utils/`나 `pages/`로 간다.

| 두는 것                                     | 두지 않는 것                      |
| ------------------------------------------- | --------------------------------- |
| 고정 id (uuid), mock 응답 객체              | `page.route` 호출                 |
| 응답을 만드는 순수 팩토리 (`generationJob`) | `expect`, 화면 조작               |
| mock 이미지 경로                            | sessionStorage 시드 같은 부수효과 |

원칙 셋.

- **id는 고정한다.** 랜덤 uuid는 실패 재현을 어렵게 한다.
- **타입은 앱에서 가져온다.** `import type { GetMoodboardResponse } from "@/lib/api/get-moodboard"` — 서버 응답 타입이 바뀌면 fixture가 typecheck에서 깨지는 게 맞다. fixture에 타입을 다시 쓰지 않는다.
- **서버 규약을 흉내내지 말고 지킨다.** 성공은 `{ data }`, 실패는 `{ error: { code, message } }` ([api.md](./api.md)). 이 래핑은 `utils/mock-api.ts`의 `ok()` / `fail()` 한 곳에만 있다.

## AI 이미지 생성 mock 원칙

1. **E2E는 Elice AX를 호출하지 않는다.** `ELICE_MODEL_API_KEY`는 서버 전용이며 **CI에 넣지 않는다** ([ai.md](./ai.md) 보안/env). 시크릿 없이 도는 것이 이 하네스의 전제다.
2. **생성 이미지는 고정 이미지로 대체한다.** Gemini 결과는 매번 다르다. `fixtures/data.ts`의 `BASE_IMAGE_URL`(`public/test-image/…`에 실제로 있는 파일)을 쓴다. 존재하지 않는 URL을 쓰면 캔버스가 이미지 로드 실패 화면으로 빠진다.
3. **생성은 job 상태 전이로 mock한다.** `mockGenerationJobSequence(page, [queued → processing → completed])`. 폴링될 때마다 다음 단계를 돌려주고 마지막 단계는 유지된다.
4. **진행률(`progressPercent`) 값을 단언하지 않는다.** 진행률은 서버 값이 아니라 `useGenerationPolling`이 시간 기준으로 채우는 **클라이언트 연출**이다(10%에서 시작해 92% 상한, `completed` 신호에 100%). "증가한다"만 검증한다.
5. **실패 경로를 반드시 함께 mock한다.** ai.md가 말하듯 *생성 호출은 실패를 전제로 구현*한다. `GENERATION_FAILED` · job `failed` · 재시도까지가 한 세트다. 성공 경로만 있는 생성 테스트는 미완성이다.
6. **서버 컴포넌트가 직접 부르는 것은 mock되지 않는다.** `page.route`는 브라우저 요청만 가로챈다. Supabase service client를 서버에서 부르는 화면은 E2E 대상이 아니다(현재 `/test/[sessionId]/edit`).

## 언제 테스트를 추가/수정하나

**기능을 추가할 때마다 테스트를 추가하지 않는다.** 핵심 여정 위에 있을 때만 손댄다.

| 무엇을 바꿨나                       | 해야 할 일                                            |
| ----------------------------------- | ----------------------------------------------------- |
| 질문·화면 수·선택 규칙              | `mood-test.spec.ts` (+ `mood-test.page.ts`의 화면 수) |
| 생성 폴링·진행률·실패 UI            | `generating.spec.ts`                                  |
| 결과물 렌더·내보내기·공유           | `moodboard-result.spec.ts`                            |
| 캔버스 도구·저장                    | `moodboard-edit.spec.ts` (+ 보류 중인 `edit.spec.ts`) |
| API 응답 스키마                     | `fixtures/data.ts` (typecheck가 먼저 잡아준다)        |
| 버튼 텍스트·`aria-label`            | 해당 `*.page.ts` 한 곳                                |
| 핵심 여정 밖의 화면 (`/ui-test` 등) | 없음                                                  |

그리고 **버그를 고칠 때**: 그 버그가 핵심 여정을 막았다면, 고치기 전에 재현하는 테스트를 먼저 추가한다. 같은 버그가 두 번 나면 그때는 반드시 추가한다.

## PR 머지 기준

**필수** — CI가 강제한다. 하나라도 빨간불이면 머지하지 않는다.

```txt
format:check → lint → typecheck → build → e2e
```

**리뷰에서 확인** — 도구가 못 잡는 것.

- 핵심 여정을 바꿨는데 spec이 그대로면, 그 이유를 PR 본문에 적었는가
- `test.skip` / `test.fixme`를 추가했다면 **사유와 해제 조건**을 주석으로 남겼는가
- 새 `data-testid`가 있다면 아래 기준을 통과하는가
- 테스트를 통과시키려고 제품 UI를 바꾸지 않았는가

**하지 않는 것**: 커버리지 수치 게이트. 숫자를 채우려는 테스트는 유지보수 비용만 남긴다.

## data-testid 사용 원칙

**기본은 쓰지 않는다.** 사용자가 화면을 찾는 방법과 같은 방법으로 찾는다. 그러면 접근성이 깨질 때 테스트도 같이 깨진다 — 그게 이득이다(PRODUCT.md 접근성 목표: WCAG AA).

우선순위:

1. `getByRole(...)` + 접근성 이름 — 버튼·다이얼로그·progressbar
2. `aria-pressed` · `role="status"` 같은 **이미 있는** 상태 속성
3. 사용자에게 보이는 텍스트
4. 그래도 안 되면 `data-testid`

지금 8개 화면 완주 헬퍼는 `aria-pressed`와 `<p role="status">N / M 선택됨</p>`만으로 동작한다. `data-testid`는 하나도 없다.

**`getByText()`는 부분 일치다.** 한때 `getByText("5%")`가 통과했는데, 화면에 렌더된 값은 `15%`였다. 짧은 문자열·숫자는 `getByRole` + 속성으로 확인한다.

`data-testid`를 추가한다면 **PR 본문에 왜 1~3으로 안 되는지 적는다.** 대개는 접근성 이름이 없다는 뜻이고, 그건 `data-testid`가 아니라 `aria-label`을 붙일 신호다.

## 역할

사람이 아니라 **역할**로 적는다. 담당자는 스프린트마다 정한다.

| 역할       | 하는 일                                                                               |
| ---------- | ------------------------------------------------------------------------------------- |
| **구현자** | 핵심 여정을 바꿨으면 해당 spec을 같은 PR에서 갱신한다. 셀렉터는 page object에만 둔다. |
| **리뷰어** | 위 "리뷰에서 확인" 항목을 본다. spec 없는 여정 변경은 이유를 묻는다.                  |
| **스위퍼** | `test.fixme` 목록과 CI 실패 이력을 주기적으로 점검하고, 해제 조건이 충족됐으면 연다.  |

- E2E 하네스 오너: `[담당자 결정]` — 새 spec 파일 추가·구조 변경 시 리뷰
- 실기기 QA(#67): `[담당자 결정]` — 자동화가 대체하지 않는다

## MVP 최소 E2E 목록

**이 목록이 전부다.** 늘리기 전에 "이게 깨지면 공유가 막히는가"를 묻는다.

| 화면            | 지키는 것                                       | 파일                       | 상태           |
| --------------- | ----------------------------------------------- | -------------------------- | -------------- |
| 홈              | 게스트가 로그인 없이 진입, Create → 테스트 이동 | `home.spec.ts`             | ✅             |
| 추구미 테스트   | 8개 화면 완주 → 생성중 이동                     | `mood-test.spec.ts`        | ✅             |
| 추구미 테스트   | 목표치 전 "다음" 비활성                         | `mood-test.spec.ts`        | ✅             |
| 생성중          | 진행률이 채워진다                               | `generating.spec.ts`       | ✅             |
| 생성중          | 완료 → 편집 이동                                | `generating.spec.ts`       | ✅             |
| 생성중          | job 실패 · 생성요청 실패 · 재시도               | `generating.spec.ts`       | ✅             |
| 결과물          | 캔버스·타입명·액션 버튼 렌더                    | `moodboard-result.spec.ts` | ✅             |
| 결과물          | PNG 내보내기 (다운로드 이벤트 + 파일명)         | `moodboard-result.spec.ts` | ✅             |
| 결과물          | 공유 — 링크 복사                                | `moodboard-result.spec.ts` | ✅             |
| 결과물          | 로드 실패 화면                                  | `moodboard-result.spec.ts` | ✅             |
| 재편집          | 도구 전환 · 스티커 · 텍스트 · Undo · 저장       | `moodboard-edit.spec.ts`   | ✅             |
| 편집(생성 직후) | 위와 동일                                       | `edit.spec.ts`             | ⏸ `test.fixme` |

**의도적으로 넣지 않은 것**

- `/login` — OAuth 리디렉션. 게스트 우선 정책이라 핵심 여정 밖이다.
- `/ui-test` — 컴포넌트 쇼케이스.
- "다시 만들기" — `window.confirm`을 띄운다. 브라우저 모달은 자동화를 멈춘다.
- 데스크톱 뷰포트 — 모바일 우선(PRD §11). 프로젝트는 `mobile-chromium`(Pixel 5) 하나다.

**`edit.spec.ts`가 멈춰 있는 이유**: `/test/[sessionId]/edit`의 서버 컴포넌트가 `getLatestGenerationJob()` → `createServiceClient()`로 Supabase를 직접 호출한다. 클라이언트 fetch가 아니라 `page.route`로 못 막고, 시크릿 없이 도는 전제라 진입이 500이다. 스펙은 다 써 두고 `test.fixme`로 막아 뒀다 — 테스트 DB seed나 env로 켜는 테스트 seam이 붙으면 한 줄만 지우면 된다.

## 실행

```bash
npm run e2e          # 프로덕션 빌드 후 :3100에 서빙하고 전체 실행
npm run e2e:ui       # Playwright UI 모드 (디버깅)
npm run e2e -- e2e/home.spec.ts
```

로컬에서 `next dev`가 아니라 프로덕션 빌드로 띄운다. Next 16은 같은 디렉터리에서 dev 서버를 두 개 못 띄우고(개발 서버 켜둔 채 E2E를 돌리면 충돌), 빌드 산출물이 CI와 같아야 결과가 안정적이다.

CI에서는 별도 job이 아니라 기존 `ci` job에 이어 붙는다 — 앞선 `Build` 스텝의 `.next`를 그대로 `next start`로 띄우기 위해서다. 실패 시에만 `playwright-report`가 아티팩트로 올라간다.
