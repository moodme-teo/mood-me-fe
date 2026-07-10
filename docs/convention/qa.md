# QA Convention

> 무드미 고유 문서 — E2E 하네스의 실제 코드는 `e2e/`, CI 정의는 `.github/workflows/ci.yml` 입니다.
> 캔버스 규칙은 [canvas.md](./canvas.md), AI 실패 처리는 [ai.md](./ai.md) · [error.md](./error.md).

## 목적

무드미의 **핵심 여정**(홈 → 추구미 테스트 → 생성중 → 결과물 → 공유)이 PR·배포 과정에서 조용히 깨지지 않도록 막는다.

이 하네스는 커버리지를 올리는 장치가 아니라 **최소 안전장치**다. PRODUCT.md의 성공 지표는 "결과물을 실제로 공유하는 것"이고, 그 경로 위의 화면만 지킨다. 그 밖의 화면은 깨져도 테스트가 잡지 못하며, 그래도 된다.

테스트가 돌아가는 것만으로는 부족하다. 다른 팀원이 읽었을 때 **"무엇을 검증하는 테스트인지"**, **"어떤 화면 동작을 추상화한 것인지"** 가 바로 보여야 한다. 그래서 아래 [`*.spec.ts` vs `*.page.ts`](#spects-vs-pagets)의 역할 분리를 강하게 지킨다.

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
| **Visual regression** | Playwright screenshot | `npm run e2e:visual`   | **로컬에서만** (CI 제외)  | ✅ 적용됨 |

**"—"는 아직 없다는 뜻이다.** Unit test는 계획만 있고 코드가 없다 — 명령을 적어 두면 있는 것처럼 읽히므로 적지 않는다. 도입 조건은 아래 §Unit test에 있다.

로컬 저장·커밋 시에는 lint/format만 돈다(lint-staged, 스테이징된 파일만). 전체 검사는 CI가 한다 — **커밋은 빠르게 유지한다.** 단 visual regression은 예외로, CI에 올리지 않는다(아래 §Visual regression).

### Unit test를 아직 넣지 않은 이유

지금 순수 로직이 얇다. 규칙 대신 **도입 조건**을 적어 둔다. 아래 중 하나라도 해당하면 Vitest를 붙인다.

- `crop-transform.ts`의 클램프·줌 계산처럼 **분기가 많고 UI 없이 검증 가능한 순수 로직**이 늘어났을 때
- `components/test/mood-test-flow.ts`의 화면 전이 규칙이 E2E로 확인하기엔 조합이 너무 많아졌을 때
- Zod 스키마와 서버 응답이 어긋나 같은 버그가 두 번 났을 때

경계는 명확하다. `useCropEditor.ts`와 `crop-transform.ts`는 Konva를 import하지 않으므로 jsdom에서 테스트할 수 있고, `CropCanvas.tsx`는 import하므로 못 한다. **Konva를 건드리는 순간 그건 E2E의 몫이다.**

### Visual regression — 도입했다. 로컬에서만 돈다

```bash
npm run e2e:visual          # 기준 이미지와 비교 (없으면 만들고 실패한다)
npm run e2e:visual:update   # UI를 의도적으로 바꿨을 때 기준 갱신
```

스펙은 `e2e/visual/`, 기준 이미지는 `e2e/visual/__screenshots__/`에 저장된다.

**기준 이미지는 커밋하지 않는다** (`.gitignore`). 각자 자기 기기에서 만들어 쓰는 로컬 도구다.

- 폰트·GPU 래스터라이즈가 기기마다 달라 **남의 기준과는 어차피 비교할 수 없다.** 공유해 봐야 남의 diff만 본다.
- UI를 만질 때마다 갱신되므로 저장소에 쌓이면 계속 무거워진다. 실제로 5장에 약 500KB였다.
- 처음 돌리면 기준이 없어 **한 번 실패하면서 기준을 만든다.** 그 상태에서 UI를 고치고 다시 돌려 비교한다. 이게 정상 흐름이다.

리뷰에서 "이 화면 안 깨졌나" 를 확인하려면 스냅샷이 아니라 **픽셀 단언**(아래)이나 E2E로 잡는다. 그건 CI에서 돈다.

**CI에서 도는 것을 막는 장치.** `playwright.config.ts`가 프로젝트를 둘로 가른다. `mobile-chromium`은 `**/visual/**`을 `testIgnore`하고, `visual`은 그것만 `testMatch`한다. CI가 부르는 `npm run e2e`는 `--project=mobile-chromium`이므로 스냅샷이 실릴 경로 자체가 없다. 워크플로를 고칠 필요도 없다.

스크린샷 비교는 폰트 렌더링·GPU 래스터라이즈·타이밍 차이로 쉽게 깨진다. 그래서 **CI에는 올리지 않는다.** 러너의 폰트와 GPU를 고정하기 전까지 CI 스냅샷은 신호가 아니라 소음이다. 개발자가 UI를 만질 때 로컬에서 돌려 눈으로 확인하는 도구로 쓴다.

**대상 — 결정론적인 화면만.** 아래는 고정 mock + `reducedMotion` + `mobile-chromium`(Pixel 5) 단일 프로젝트라 스냅샷이 안정적이다.

| 화면                    | 결정론적인 이유                                      |
| ----------------------- | ---------------------------------------------------- |
| 홈 — 메인(첫진입)       | 저장 보드 0개 · 스플래시 skip                        |
| 홈 — History            | `mockMoodboards` 고정 목록                           |
| 생성중 — 에러           | job `failed` 고정. 진행률 화면은 **제외**(시간 의존) |
| 결과물                  | `mockMoodboard` 고정 응답                            |
| 크롭 에디터 — 기본 상태 | 도형 탭 · 원형 · 투명 배경 (DEFAULT_STATE)           |

**전제 셋.** 지키지 않으면 곧바로 flaky가 된다.

- **고정 mock 이미지.** AI 생성 이미지는 매번 다르다. `fixtures/data.ts`의 `BASE_IMAGE_URL`만 쓴다.
- **`reducedMotion: "reduce"`.** 이미 `playwright.config.ts`에 켜져 있다.
- **시간 의존 화면 제외.** 생성 진행률은 `useGenerationPolling`이 시간 기준으로 채우므로 스냅샷을 찍을 수 없다.

### 픽셀 단언 — 스냅샷 대신 좌표 몇 개

`mood-edit.md` §11은 _"미리보기에서 보이는 것과 저장 결과물이 달라지면 신뢰가 깨진다"_ 고 못박는다. 이 제품의 핵심 계약인데 DOM 단언으로는 닿지 않는다. 그렇다고 스냅샷 전체를 CI에 걸 수는 없다(위 §Visual regression). 그래서 **전체 이미지 비교 대신 의미 있는 좌표 몇 개의 색만 읽는다.** `e2e/utils/pixels.ts`가 그 도구다.

- 좌표는 **0~1 비율**. 미리보기 캔버스(디스플레이 크기 × DPR)와 내보낸 이미지(720px)는 해상도가 다르다.
- 색은 **좌표 주변 상자의 평균**. 리샘플링 노이즈는 지워지고 "배경이 빠졌다 · 도형이 안 먹었다 · 이미지가 밀렸다" 는 남는다.
- 디코딩은 **브라우저에서**. 사용자가 보는 것과 같은 디코더를 쓰고, Node 쪽 이미지 의존성을 늘리지 않는다.

이 도구로 지금 지키는 계약 셋:

| 계약                                | 어디서                     |
| ----------------------------------- | -------------------------- |
| 저장 결과물 = 미리보기 (§11)        | `moodboard-edit.spec.ts`   |
| PNG는 투명 유지 · JPG는 흰 배경(§7) | `moodboard-edit.spec.ts`   |
| 내려받은 PNG = 저장된 크롭 결과     | `moodboard-result.spec.ts` |

**미리보기↔결과물 비교는 단색 배경에서만 한다.** 투명 배경의 체크보드는 Konva Stage가 아니라 뒤에 깔린 DOM `div`라 export에 들어가지 않는다. 투명 배경으로 비교하면 "배경이 사라졌다"는 거짓 실패가 난다.

**Konva는 다음 프레임에 그린다.** `aria-pressed`가 바뀌었다고 픽셀이 바뀐 게 아니다. 픽셀을 읽기 전에는 `EditPage.waitForPreviewPaint()`로 rAF를 두 번 기다린다.

**추구미 테스트의 프리뷰 보드는 스냅샷 대상이 아니다.** 무엇이 담기는지는 확정됐고(§5.3 — 살아남은 카드를 나열한다) `mood-test.spec.ts`가 개수로 검증한다. 하지만 카드 재배치가 `framer-motion` layout 애니메이션이라 스냅샷은 프레임을 잡아 흔들린다. **무엇이 담기는지는 단언하고, 어떻게 움직이는지는 단언하지 않는다.**

## e2e 폴더 구조

```txt
e2e/
├─ fixtures/
│  └─ data.ts               고정 테스트 데이터 (id, mock 무드보드, job 팩토리)
├─ pages/
│  ├─ home.page.ts          화면별 locator + 조작
│  ├─ mood-test.page.ts
│  ├─ mood-test-generating.page.ts
│  ├─ edit.page.ts
│  └─ moodboard-result.page.ts
├─ utils/
│  ├─ mock-api.ts           page.route 기반 API mock
│  └─ session.ts            sessionStorage 시드 (스플래시 skip 등)
├─ home.spec.ts             시나리오
├─ mood-test.spec.ts
├─ mood-test-generating.spec.ts
├─ edit.spec.ts             생성 직후 편집 (보류)
├─ moodboard-edit.spec.ts   저장본 재편집
└─ moodboard-result.spec.ts
```

배럴(`index.ts`)은 만들지 않는다 — [AGENTS.md](../../AGENTS.md) 절대 규칙 3. spec이 필요한 page object를 직접 import한다.

`@/*` 별칭은 `./src/*`만 가리키므로 `e2e/` 내부는 상대경로를 쓴다(ESLint에 예외 등록됨).

## `*.spec.ts` vs `*.page.ts`

**spec은 "무엇을 검증하는가", page는 "어떻게 조작하는가".** spec에 CSS 셀렉터가 등장하면 그건 page로 갈 코드다.

| 항목      | `*.spec.ts`                             | `*.page.ts`                          |
| --------- | --------------------------------------- | ------------------------------------ |
| 담는 것   | 시나리오, `expect` 단언                 | locator, 조작 메서드, 화면 고유 지식 |
| 금지      | 셀렉터 문자열, `page.locator(...)`      | `expect` 단언 (대기 목적은 예외)     |
| 읽는 사람 | "이 화면은 무엇을 보장하나"를 알고 싶은 | "이 버튼을 어떻게 찾나"를 알고 싶은  |

```ts
// bad — spec이 셀렉터를 안다
await page.locator('button[aria-pressed="false"]').first().click();
await expect(page.locator('p[role="status"]')).toContainText("1 / 12 선택됨");

// good — spec은 의도만 말한다
await moodTest.pickOne();
await expect(moodTest.selectionStatus).toContainText("1 / 12 선택됨");
```

### spec 파일 작성 원칙

spec은 **사용자 관점의 플로우**를 시나리오로 적고 `expect`로 단언한다. 셀렉터를 직접 쓰지 않고 page object의 메서드를 호출한다.

파일 상단에 다섯 가지를 주석으로 남긴다. 뒤의 두 개(전제 조건 · 테스트하지 않는 것)가 실제로 시간을 아껴 준다 — 왜 mock이 필요한지, 왜 이 화면의 어떤 부분은 검증하지 않는지를 다음 사람이 다시 추론하지 않아도 된다.

1. 테스트 대상 기능
2. 검증하려는 사용자 시나리오
3. smoke / regression / edge case 중 어디에 가까운지
4. 테스트 전제 조건
5. 테스트하지 않는 것

```ts
/**
 * 테스트 대상: 무드보드 결과 페이지 (/moodboard/[moodboardId])
 *
 * 시나리오:
 * - 사용자가 편집을 마치고 결과 페이지에 진입한다.
 * - 무드보드 캔버스와 공유·내보내기 액션을 확인한다.
 *
 * 테스트 성격: smoke
 *
 * 전제 조건:
 * - GET /api/moodboards/{id} 를 mockMoodboard 로 가로챈다.
 * - MOODBOARD_ID 는 fixtures/data.ts 의 고정 uuid.
 *
 * 테스트하지 않는 것:
 * - AI 이미지 생성 품질
 * - 실제 SNS 공유 성공 여부 (클립보드 복사까지만 본다)
 */
```

**테스트 제목은 한국어로, 코드의 변수·함수명은 영어로 쓴다.** 제목은 "무엇이 보장되는가"를 문장으로 말해야 한다.

| 좋은 제목                          | 나쁜 제목         |
| ---------------------------------- | ----------------- |
| `캔버스와 크롭 도구를 렌더한다`    | `test1`           |
| `도형을 고르면 활성 도형이 바뀐다` | `edit page works` |
| `저장에 실패하면 토스트를 띄운다`  | `button click`    |

### page object 작성 원칙

page object는 locator를 정의하고, 반복되는 UI 동작을 메서드로 캡슐화한다. **검증하는 `expect`는 두지 않는다.** 다음 단계로 넘어가기 위한 **대기**는 예외다 — `waitFor`(`edit.page.ts`)든, 반영을 기다리는 폴링용 `expect`(`mood-test.page.ts`의 `pickOne()`)든 상관없다. 기준은 "이게 실패하면 테스트가 무엇을 알려주는가"다. 시나리오의 결론을 말하면 spec으로, 다음 조작의 전제를 맞추는 것이면 page에 둔다.

파일 상단에 세 가지를 남긴다: 담당 화면, spec에서 숨기는 UI 동작, 공개 메서드의 사용 기준.

```ts
/**
 * EditPage — 크롭 편집 화면 (/moodboard/[id]/edit · /test/[sessionId]/edit)
 *
 * 숨기는 것:
 * - 하단 탭과 배경 패널의 버튼 이름이 겹쳐 스코프·정확 일치가 필요하다는 사실
 * - 저장이 곧바로 저장하지 않고 시트를 먼저 연다는 흐름
 *
 * 사용 기준:
 * - 의미 있는 사용자 행동만 메서드로 노출한다 (selectShape, openSaveSheet …)
 * - 단순 단언은 spec 에서 처리한다 — 여기서는 locator 만 내어 준다
 */
```

공개 메서드에는 짧은 JSDoc을 붙인다. **설명이 "무엇을 하는지"에 그치면 지운다.** 코드가 이미 말하고 있다. 남길 가치가 있는 건 화면이 가진 **비직관적인 사실**이다.

```ts
// 나쁨 — 코드가 그대로 말하고 있다
/** 저장 버튼을 클릭한다. */
async openSaveSheet() {
  await this.saveButton.click();
}

// 좋음 — 읽는 사람이 모르는 것을 말한다
/** 저장된 무드보드 재편집 — 서버 조회 없이 렌더되므로 E2E 로 검증 가능하다. */
async gotoSaved(moodboardId: string) {
  await this.page.goto(`/moodboard/${moodboardId}/edit`);
}
```

**page object는 처음부터 만든다.** "반복될 때만"으로 미루면 셀렉터가 spec 여기저기 박힌 뒤에야 옮기게 된다.

화면이 가진 **비직관적인 사실은 page object에 주석으로 남긴다.** 그 사실을 알아야 하는 사람이 읽을 자리가 거기다. 예를 들어 생성중 화면의 진행률이 서버 값이 아니라는 사실은 `mood-test-generating.page.ts`의 `readPercent()` 위에 있고, 도형 `원`이 `타원`에 부분 일치해 정확 일치가 필요하다는 사실은 `edit.page.ts`의 `shape()` 위에 있다.

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
2. **생성 이미지는 고정 이미지로 대체한다.** Gpt 결과는 매번 다르다. `fixtures/data.ts`의 `BASE_IMAGE_URL`(`public/test-image/…`에 실제로 있는 파일)을 쓴다. 존재하지 않는 URL을 쓰면 캔버스가 이미지 로드 실패 화면으로 빠진다.
3. **생성은 job 상태 전이로 mock한다.** `mockGenerationJobSequence(page, [queued → processing → completed])`. 폴링될 때마다 다음 단계를 돌려주고 마지막 단계는 유지된다.
4. **진행률(`progressPercent`) 값을 단언하지 않는다.** 진행률은 서버 값이 아니라 `useGenerationPolling`이 시간 기준으로 채우는 **클라이언트 연출**이다(10%에서 시작해 92% 상한, `completed` 신호에 100%). "증가한다"만 검증한다.
5. **실패 경로를 반드시 함께 mock한다.** ai.md가 말하듯 *생성 호출은 실패를 전제로 구현*한다. `GENERATION_FAILED` · job `failed` · 재시도까지가 한 세트다. 성공 경로만 있는 생성 테스트는 미완성이다.
6. **서버 컴포넌트가 직접 부르는 것은 mock되지 않는다.** `page.route`는 브라우저 요청만 가로챈다. Supabase service client를 서버에서 부르는 화면은 E2E 대상이 아니다(현재 `/test/[sessionId]/edit`).

## 언제 테스트를 추가/수정하나

**기능을 추가할 때마다 테스트를 추가하지 않는다.** 핵심 여정 위에 있을 때만 손댄다.

| 무엇을 바꿨나                       | 해야 할 일                                            |
| ----------------------------------- | ----------------------------------------------------- |
| 질문·화면 수·선택 규칙              | `mood-test.spec.ts` (+ `mood-test.page.ts`의 화면 수) |
| 생성 폴링·진행률·실패 UI            | `mood-test-generating.spec.ts`                        |
| 결과물 렌더·내보내기·공유           | `moodboard-result.spec.ts`                            |
| 크롭 도형·배경·확대·저장            | `moodboard-edit.spec.ts` (+ 보류 중인 `edit.spec.ts`) |
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

> **`dev` 를 병합하면 이 계약이 바뀐다** ([#129](https://github.com/moodme-teo/mood-me-fe/issues/129)). 추구미 테스트 화면이 다시 만들어져 `N / M 선택됨` 이 사라지고(프리뷰 보드의 카운트 배지가 대신한다), 덜어내기·최종 대결은 `aria-pressed` 토글이 아니라 드래그 UI가 된다. 이 절의 예시는 병합 전 기준이다.

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

| 화면            | 지키는 것                                       | 파일                           | 상태           |
| --------------- | ----------------------------------------------- | ------------------------------ | -------------- |
| 홈              | 게스트가 로그인 없이 진입, Create → 테스트 이동 | `home.spec.ts`                 | ✅             |
| 추구미 테스트   | 8개 화면 완주 → 생성중 이동                     | `mood-test.spec.ts`            | ✅             |
| 추구미 테스트   | 목표치 전 "다음" 비활성                         | `mood-test.spec.ts`            | ✅             |
| 추구미 테스트   | 정원 도달 시 잠금 · 연타해도 초과 없음          | `mood-test.spec.ts`            | ✅             |
| 추구미 테스트   | 재선택 해제 · 뒤로가기 시 선택 유지             | `mood-test.spec.ts`            | ✅             |
| 추구미 테스트   | 상위 단계 변경 → 확인 후 하위 초기화            | `mood-test.spec.ts`            | ✅             |
| 추구미 테스트   | 프리뷰 보드에 살아남은 카드가 쌓인다·빠진다     | `mood-test.spec.ts`            | ✅             |
| 생성중          | 진행률이 채워진다                               | `mood-test-generating.spec.ts` | ✅             |
| 생성중          | 완료 → 편집 이동                                | `mood-test-generating.spec.ts` | ✅             |
| 생성중          | job 실패 · 생성요청 실패 · 재시도               | `mood-test-generating.spec.ts` | ✅             |
| 결과물          | 캔버스·타입명·액션 버튼 렌더                    | `moodboard-result.spec.ts`     | ✅             |
| 결과물          | PNG 내보내기 (다운로드 이벤트 + 파일명 + 픽셀)  | `moodboard-result.spec.ts`     | ✅             |
| 결과물          | 공유 — 링크 복사                                | `moodboard-result.spec.ts`     | ✅             |
| 결과물          | "다시 만들기" 확인 다이얼로그 (확인·취소)       | `moodboard-result.spec.ts`     | ✅             |
| 결과물          | 로드 실패 화면                                  | `moodboard-result.spec.ts`     | ✅             |
| 재편집          | 도형·배경·확대 전환, 탭 전환                    | `moodboard-edit.spec.ts`       | ✅             |
| 재편집          | 저장 시트 — PNG 다운로드 · 완성 후 결과물 이동  | `moodboard-edit.spec.ts`       | ✅             |
| 재편집          | 저장 결과물 = 미리보기 (픽셀)                   | `moodboard-edit.spec.ts`       | ✅             |
| 재편집          | PNG 투명 유지 · JPG 흰 배경 (픽셀)              | `moodboard-edit.spec.ts`       | ✅             |
| 재편집          | 저장 실패 토스트 · 나가기 확인 다이얼로그       | `moodboard-edit.spec.ts`       | ✅             |
| 편집(생성 직후) | 위와 동일 (같은 `MoodboardCropEditor` 를 렌더)  | `edit.spec.ts`                 | ⏸ `test.fixme` |

**의도적으로 넣지 않은 것**

- `/login` — OAuth 리디렉션. 게스트 우선 정책이라 핵심 여정 밖이다.
- `/ui-test` — 컴포넌트 쇼케이스.
- 데스크톱 뷰포트 — 모바일 우선(PRD §11). 프로젝트는 `mobile-chromium`(Pixel 5) 하나다.

**`edit.spec.ts`가 멈춰 있는 이유**: `/test/[sessionId]/edit`의 서버 컴포넌트가 `getLatestGenerationJob()` → `createServiceClient()`로 Supabase를 직접 호출한다. 클라이언트 fetch가 아니라 `page.route`로 못 막고, 시크릿 없이 도는 전제라 진입이 500이다.

같은 계층의 `getMoodboardById()`는 `canUseSupabaseService()`로 env를 확인해 mock으로 폴백하는데 `getLatestGenerationJob()`에는 그 가드가 없다 — 재편집(`/moodboard/[id]/edit`)만 돌고 생성 직후 편집은 못 도는 이유가 이 비대칭이다. 스펙은 같은 화면 기준으로 다 써 두고 `test.fixme`로 막아 뒀다. 테스트 DB seed를 붙이거나 저 가드를 맞춰 주면 한 줄만 지우면 된다.

## 합의된 P0 플로우 대조표

팀이 반드시 덮기로 한 열 개 플로우다. **덮지 못한 것은 왜 못 덮었는지가 함께 적혀 있어야 한다** — 표에 빈칸이 있으면 다음 사람은 그것이 누락인지 판단인지 알 수 없다.

| #     | 플로우                    | 상태        | 어디에 / 왜 못 하는가                                                                         |
| :---- | :------------------------ | :---------- | :-------------------------------------------------------------------------------------------- |
| P0-1  | 게스트 최초 완주          | ⏸ 선행 조건 | `/test/[id]/edit`이 Supabase를 직접 호출해 mock 불가. env 가드가 선행 ([#120][120])           |
| P0-2  | 테스트 단계별 선택 불변식 | ✅ 8개      | `mood-test.spec.ts` — 세 겹 방어(버튼·disabled·리듀서)를 각각 친다                            |
| P0-3  | 생성 버튼 중복 클릭 방지  | ⚠️ 재해석   | 생성 버튼이 없다. 생성은 화면 마운트로 트리거된다 — 아래 주석                                 |
| P0-4  | 생성 화면 새로고침·재진입 | ❌ 미구현   | 지금은 새로고침이 AI를 다시 돌린다 ([#115][115])                                              |
| P0-5  | 생성 재시도               | 🔶 부분     | 실패 화면·재시도·폴링 재개는 덮음. 연타 방지·job 구분·탈출 경로는 미구현 ([#122][122])        |
| P0-6  | 편집 기본 동작            | 🔶 부분     | 도형·배경·확대·초기화는 덮음. 경계값(최소 배율·밀어내기)은 `crop-transform.ts` unit 자리      |
| P0-7  | 미리보기 ↔ export 일치    | ✅ 3개      | `moodboard-edit.spec.ts` · `moodboard-result.spec.ts` — 픽셀 단언                             |
| P0-8  | 편집 이탈 처리            | 🔶 부분     | 뒤로 버튼만 덮음. 정책 자체가 안내와 어긋난다 ([#119][119])                                   |
| P0-9  | 완성본 저장 중 실패       | ✅ 1개      | `moodboard-edit.spec.ts` — 토스트 + 편집 상태 유지. 중복 row는 `upsert(id)`라 구조적으로 불가 |
| P0-10 | 결과 → 편집 왕복          | 🔶 부분     | 이동은 덮음. **구도 복원은 저장되는 데이터가 없어 불가** ([#116][116])                        |

[115]: https://github.com/moodme-teo/mood-me-fe/issues/115
[116]: https://github.com/moodme-teo/mood-me-fe/issues/116
[119]: https://github.com/moodme-teo/mood-me-fe/issues/119
[120]: https://github.com/moodme-teo/mood-me-fe/issues/120
[122]: https://github.com/moodme-teo/mood-me-fe/issues/122

**P0-3을 다시 읽어야 하는 이유.** "생성하기 버튼을 여러 번 빠르게 클릭한다"는 시나리오는 이 제품에 존재하지 않는다. 마지막 화면의 "무드보드 생성하기"는 `POST /api/mood-test-sessions`(답변 저장)만 부르고 `isSubmitting`으로 이미 잠겨 있다. 진짜 생성 요청(`POST .../generate`)은 생성중 화면이 **마운트될 때** 자동으로 나간다. 그래서 위험은 연타가 아니라 **재마운트**다 — 새로고침·뒤로가기·재진입. 시나리오를 P0-4로 옮겨 읽어야 한다.

**P0-6·P0-7의 경계값은 E2E가 아니라 unit이 맡는다.** "최소 배율 이하로 축소 불가", "크롭 내부에 빈 공간이 생기지 않음", "화면 밖으로 완전히 밀어낼 수 없음"은 전부 `clampTransform`의 순수 계산이다. 브라우저를 띄워 확인할 이유가 없고, 조합도 많다. Vitest를 붙일 때 첫 대상이다.

또 하나 — "크롭 내부에 빈 공간이 생기지 않음"은 **도형을 골랐을 때만 참이다.** `getCropFit("none")`은 `contain`이라 기본 상태(크롭 안 함)에서는 여백이 생기고 배경색으로 채워진다. 그게 의도다 (mood-edit.md §7).

## 실행

```bash
npm run e2e          # 프로덕션 빌드 후 :3100에 서빙하고 전체 실행
npm run e2e:ui       # Playwright UI 모드 (디버깅)
npm run e2e -- e2e/home.spec.ts
```

로컬에서 `next dev`가 아니라 프로덕션 빌드로 띄운다. Next 16은 같은 디렉터리에서 dev 서버를 두 개 못 띄우고(개발 서버 켜둔 채 E2E를 돌리면 충돌), 빌드 산출물이 CI와 같아야 결과가 안정적이다.

CI에서는 별도 job이 아니라 기존 `ci` job에 이어 붙는다 — 앞선 `Build` 스텝의 `.next`를 그대로 `next start`로 띄우기 위해서다. 실패 시에만 `playwright-report`가 아티팩트로 올라간다.
