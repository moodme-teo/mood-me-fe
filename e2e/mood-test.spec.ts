import { expect, test } from "@playwright/test";

import { TEST_SESSION_ID } from "./fixtures/data";
import { MoodTestPage } from "./pages/mood-test.page";
import {
  mockGenerationSuccess,
  mockGuestSession,
  mockSaveMoodTestSession,
} from "./utils/mock-api";
import { seedMoodTestDraft } from "./utils/session";

/**
 * 테스트 대상: 추구미 테스트 (`/test/[sessionId]` — PRD §5.3)
 * 스펙 원본: docs/work/todo/mood-test-questions.md (7/7 확정, 구현 기준)
 *
 * 단발 객관식이 아니라 **3막 선택 메커니즘**이다. 무엇을 골랐는가보다 **무엇을 언제
 * 버렸는가**가 분석 재료다. 그래서 화면은 8개로 고정돼 있고 각 화면의 목표 선택 수가 다르다.
 * (상수 출처: components/test/mood-test-flow.ts 의 TOTAL_SCREENS · targetCountForScreen)
 *
 *   막   화면            풀            목표   수집 데이터        의미
 *   ─────────────────────────────────────────────────────────────────────────────
 *   A    담기            카드 36장     12장   selected[12]      손이 먼저 가는 것
 *   B1   덜어내기        담은 12장      4장   dropped_r1[4]     → 8장 남음
 *   B2   더 덜어내기     남은 8장       3장   dropped_r2[3]     → 5장 = **확신의 가치**
 *   C    그림자          텍스트 칩 8개  3개   shadows[3]        나를 무겁게 하는 것
 *   D    전환 ×3         그림자별 4지선다 1개  transitions[3]   = **열망의 가치**
 *   E    최종 대결       확신5 + 열망3  5장   final[5]          지켜온 것 vs 바라는 것
 *
 * D는 C에서 고른 그림자 **개수만큼(3개) 화면이 동적으로 생성**된다. 그래서 8 = 1+1+1+1+3+1.
 * 덜어내기(B)는 "버리기"가 아니라 남은 카드가 프리뷰 보드에 자리를 잡아가는 **확정의 경험**으로
 * 연출된다 — 상실감을 주면 완주율이 떨어진다. 자유입력 단계는 완료율 보호를 위해 두지 않는다.
 *
 * **선택 불변식.** 이 화면들은 단발 객관식이 아니라 앞 화면의 결과가 뒤 화면의 풀이 되는
 * 사슬이라, 개수 규칙이 깨지면 여정 자체가 무의미해진다. 세 겹으로 막혀 있다.
 *
 *   ① 목표 미달 → "다음" 비활성            (TestFooter 의 disabled)
 *   ② 정원 도달 → 안 고른 선택지 disabled  (CardGrid 의 atCapacity)
 *   ③ 그래도 들어오면 → 리듀서가 무시       (toggleDraftId 의 정원 초과 분기)
 *
 * ③은 ②가 뚫려도(연타·경합) 버티는 마지막 방어선이다. E2E 는 ②를 클릭으로, ③을 연타로 친다.
 *
 * **상위 단계를 고치면 하위 단계가 초기화된다.** 담기 12장을 바꾸면 덜어내기의 풀 자체가
 * 달라지므로 뒤 단계를 남겨 둘 수가 없다 (commitScreen). 조용히 지우면 사용자는 왜 사라졌는지
 * 모른다 — 확정 전에 다이얼로그로 알린다. 잃을 것이 없으면(뒤 단계를 아직 안 골랐으면) 묻지 않는다.
 *
 * 시나리오:
 * - 8화면을 완주하면 여정(Journey)이 서버로 전송되고 생성중 화면으로 넘어간다.
 * - 각 화면은 목표 선택 수를 채우기 전까지 "다음" 이 비활성이다 (§5.3 선택 규칙).
 *   충족 전에는 "N / M 선택됨" 만 갱신된다.
 * - 정원을 채우면 나머지 선택지를 누를 수 없고, 연타해도 목표치를 넘지 않는다.
 * - 고른 것을 다시 누르면 해제된다 (같은 선택이 중복 저장되지 않는다).
 * - 뒤로 가면 그 화면의 선택이 그대로 남아 있다.
 * - 상위 단계를 바꾸면 확인을 거쳐야 하고, 확인하면 하위 단계가 비워진다.
 * - 프리뷰 보드에 지금까지 살아남은 카드가 나열된다.
 * - 마지막 화면에서 "다음" 은 "무드보드 생성하기" 로 바뀐다.
 *
 * **프리뷰 보드는 "살아남은 카드" 를 보여준다** (§5.3 — 상실이 아니라 확정의 경험).
 * 그래서 화면마다 의미가 뒤집힌다. 담기에서는 고른 카드가 쌓이고, 덜어내기에서는 고른
 * 카드가 **빠진다** — 덜어내기의 선택은 "버릴 카드" 이기 때문이다.
 *
 * 테스트 성격: smoke (+ 선택 규칙은 edge case)
 *
 * 전제 조건:
 * - 게스트 세션 발급·답변 저장을 mock 한다.
 * - 완주 후 도착하는 생성중 화면이 곧바로 생성을 트리거하므로 그 경로까지 함께 mock 한다.
 * - MoodTestPage 는 화면 종류를 모른 채 aria-pressed + "N / M 선택됨" 만으로 완주한다.
 *   화면마다 선택지 UI(카드 그리드·칩·4지선다)가 달라도 조작이 같아지는 이유다.
 *
 * 테스트하지 않는 것:
 * - 카드 36장·그림자 칩 8개·전환 32개의 실제 내용 (mood-test-questions.md 소관)
 * - 여정 로깅 스키마의 정확성 — `toggles`(카드별 담았다 뺐다 횟수)나 `dropped_r2` 가
 *   올바로 쌓이는지는 순수 함수(flowReducer)의 몫이라 E2E 가 아니라 unit test 자리다.
 *   지금은 그 로직이 UI 없이 검증 가능해졌을 때 Vitest 를 붙인다 (qa.md 도입 조건).
 * - 페르소나 20종 판정·AI 해석 프레임 — 서버의 computePersonaResult 소관
 * - 프리뷰 보드의 **연출** (재배치 스프링 모션) — reducedMotion 으로 꺼져 있다.
 *   무엇이 담기는지는 검증하고, 어떻게 움직이는지는 검증하지 않는다.
 * - 초기화 규칙의 모든 조합 (담기·덜어내기·그림자·전환이 각각 무엇을 지우는지) —
 *   commitScreen 은 순수 함수라 조합 폭발은 unit test 자리다. 여기서는 대표 경로 하나로
 *   "확인을 거친다 · 실제로 비워진다" 만 본다.
 * - 여러 탭 동시 편집 — 마지막에 쓴 탭이 이긴다(§10.2). 두 컨텍스트를 띄워야 해 비용 대비
 *   얻는 게 적다.
 * - localStorage 접근 불가 — 저장을 건너뛸 뿐이라 화면에 드러나는 변화가 없다.
 *
 * 드래프트 버전 불일치는 아래 "드래프트 복원" describe 에서 다룬다 (#121).
 */

// 담기(A) 12장 → 덜어내기 1차(B1) 4장. 화면별 목표치는 targetCountForScreen 이 정한다.
const GATHER_TARGET = 12;
const TRIM1_TARGET = 4;
test.describe("추구미 테스트", () => {
  test("8개 화면을 완주하면 생성중 화면으로 이동한다", async ({ page }) => {
    await mockGuestSession(page);
    await mockSaveMoodTestSession(page);
    // 도착 직후 생성중 화면이 곧바로 생성을 트리거하므로 함께 mock 한다.
    await mockGenerationSuccess(page);

    const moodTest = new MoodTestPage(page);
    await moodTest.goto(TEST_SESSION_ID);
    await expect(moodTest.nextButton).toBeVisible();

    await moodTest.complete();

    await moodTest.waitForGenerating(TEST_SESSION_ID);
  });

  test("첫 화면에서 목표치를 채우기 전에는 다음으로 넘어갈 수 없다", async ({
    page,
  }) => {
    const moodTest = new MoodTestPage(page);
    await moodTest.goto(TEST_SESSION_ID);

    await expect(moodTest.nextButton).toBeDisabled();

    await moodTest.pickOne();

    await expect(moodTest.selectionStatus).toContainText("1 / 12 선택됨");
    await expect(moodTest.nextButton).toBeDisabled();
  });

  test("정원을 채우면 나머지 선택지를 누를 수 없다", async ({ page }) => {
    const moodTest = new MoodTestPage(page);
    await moodTest.goto(TEST_SESSION_ID);

    await moodTest.fillCurrentScreen();

    await expect(moodTest.selectionStatus).toContainText(
      `${GATHER_TARGET} / ${GATHER_TARGET} 선택됨`,
    );
    await expect(moodTest.nextButton).toBeEnabled();
    // atCapacity 가 고르지 않은 카드를 전부 disabled 로 만든다.
    await expect(moodTest.unpickedOptions).toHaveCount(0);
  });

  // ②(disabled)가 뚫려도 ③(리듀서의 정원 초과 무시)이 버텨야 한다. 리렌더 전에 목표치보다
  // 많이 눌러, 아직 활성인 카드로 정원을 넘길 수 있는지 친다.
  test("빠르게 연타해도 목표치를 넘지 않는다", async ({ page }) => {
    const moodTest = new MoodTestPage(page);
    await moodTest.goto(TEST_SESSION_ID);

    await moodTest.burstPick(GATHER_TARGET + 6);

    await expect(moodTest.selectionStatus).toContainText(
      `${GATHER_TARGET} / ${GATHER_TARGET} 선택됨`,
    );
    await expect(moodTest.pickedOptions).toHaveCount(GATHER_TARGET);
  });

  test("고른 것을 다시 누르면 해제된다", async ({ page }) => {
    const moodTest = new MoodTestPage(page);
    await moodTest.goto(TEST_SESSION_ID);

    await moodTest.pickOne();
    await moodTest.pickOne();
    await expect(moodTest.pickedOptions).toHaveCount(2);

    await moodTest.unpickOne();

    // 두 번 누른 카드가 두 번 담기지 않는다 — 해제되어 하나만 남는다.
    await expect(moodTest.pickedOptions).toHaveCount(1);
    await expect(moodTest.selectionStatus).toContainText("1 / 12 선택됨");
  });

  test("담기에서 고른 카드가 프리뷰 보드에 쌓인다", async ({ page }) => {
    const moodTest = new MoodTestPage(page);
    await moodTest.goto(TEST_SESSION_ID);

    await expect(moodTest.previewBoard).toBeVisible();
    await expect(moodTest.previewCards).toHaveCount(0);

    await moodTest.pickOne();
    await expect(moodTest.previewCards).toHaveCount(1);

    await moodTest.pickOne();
    await expect(moodTest.previewCards).toHaveCount(2);

    await moodTest.unpickOne();
    await expect(moodTest.previewCards).toHaveCount(1);
  });

  // 덜어내기의 선택은 "버릴 카드" 다. 그래서 고를수록 프리뷰에서 빠진다 —
  // 남은 카드가 자리를 잡아가는 연출(§5.3)이지 상실의 연출이 아니다.
  test("덜어내기에서 고른 카드는 프리뷰에서 빠진다", async ({ page }) => {
    const moodTest = new MoodTestPage(page);
    await moodTest.goto(TEST_SESSION_ID);

    await moodTest.fillCurrentScreen();
    await moodTest.nextButton.click();

    await expect(moodTest.previewCards).toHaveCount(GATHER_TARGET);

    await moodTest.pickOne();
    await expect(moodTest.previewCards).toHaveCount(GATHER_TARGET - 1);

    await moodTest.fillCurrentScreen();
    await expect(moodTest.previewCards).toHaveCount(
      GATHER_TARGET - TRIM1_TARGET,
    );
  });

  test("뒤로 가면 그 화면의 선택이 그대로 남는다", async ({ page }) => {
    const moodTest = new MoodTestPage(page);
    await moodTest.goto(TEST_SESSION_ID);

    await moodTest.fillCurrentScreen();
    await moodTest.nextButton.click();
    await expect(moodTest.selectionStatus).toContainText(
      `0 / ${TRIM1_TARGET} 선택됨`,
    );

    await moodTest.back();

    // initialDraftForScreen 이 committed.selected 로 draft 를 되살린다.
    await expect(moodTest.selectionStatus).toContainText(
      `${GATHER_TARGET} / ${GATHER_TARGET} 선택됨`,
    );
    await expect(moodTest.pickedOptions).toHaveCount(GATHER_TARGET);
  });

  // 잃을 것이 없으면 묻지 않는다. 뒤 단계를 아직 고르지 않았으니 그냥 넘어가야 한다.
  test("바꾸지 않고 넘어가면 확인을 묻지 않는다", async ({ page }) => {
    const moodTest = new MoodTestPage(page);
    await moodTest.goto(TEST_SESSION_ID);

    await moodTest.fillCurrentScreen();
    await moodTest.nextButton.click();
    await moodTest.back();
    await moodTest.nextButton.click();

    await expect(moodTest.resetDialog).toBeHidden();
    await expect(moodTest.selectionStatus).toContainText(
      `0 / ${TRIM1_TARGET} 선택됨`,
    );
  });

  test("상위 단계를 바꾸면 확인을 거쳐 하위 단계가 비워진다", async ({
    page,
  }) => {
    const moodTest = new MoodTestPage(page);
    await moodTest.goto(TEST_SESSION_ID);

    // 담기 12장 → 덜어내기 4장까지 확정해 둔다. 이게 지워질 대상이다.
    await moodTest.fillCurrentScreen();
    await moodTest.nextButton.click();
    await moodTest.fillCurrentScreen();
    await moodTest.nextButton.click();

    // 담기 화면으로 돌아가 카드 한 장을 갈아 끼운다 — 해제한 카드를 도로 고르면
    // 선택 집합이 그대로라 초기화가 일어나지 않는다.
    await moodTest.back();
    await moodTest.back();
    await moodTest.unpickOne();
    await moodTest.pickAnother();

    await moodTest.nextButton.click();
    await expect(moodTest.resetDialog).toBeVisible();

    // 취소하면 담기 화면에 그대로 머문다.
    await moodTest.resetCancelButton.click();
    await expect(moodTest.resetDialog).toBeHidden();
    await expect(moodTest.selectionStatus).toContainText(
      `${GATHER_TARGET} / ${GATHER_TARGET} 선택됨`,
    );

    await moodTest.nextButton.click();
    await moodTest.resetConfirmButton.click();

    // 덜어내기로 넘어가되, 아까 고른 4장은 사라져 있다.
    await expect(moodTest.selectionStatus).toContainText(
      `0 / ${TRIM1_TARGET} 선택됨`,
    );
  });
});

/**
 * 드래프트 복원과 질문 세트 버전 (#121 · PRD §5.7 · §10.2)
 *
 * 드래프트는 자기가 어느 질문 세트 위에서 만들어졌는지 기억한다. 세트가 바뀌면 예전에 고른
 * 카드가 새 세트에 없을 수 있어 이어갈 수 없다 — 조용히 처음으로 돌려보내지 않고 모달로 알린다.
 */
test.describe("추구미 테스트 — 드래프트 복원", () => {
  // c01~c12 를 담고, 그중 4장·3장을 덜어내 C(그림자) 화면까지 온 사람.
  const AT_SHADOW_SCREEN = {
    stepIndex: 3,
    committed: {
      selected: Array.from(
        { length: 12 },
        (_, i) => `c${String(i + 1).padStart(2, "0")}`,
      ),
      droppedR1: ["c01", "c02", "c03", "c04"],
      droppedR2: ["c05", "c06", "c07"],
    },
  };

  test("같은 버전이면 마지막 단계부터 이어서 진행한다", async ({ page }) => {
    await seedMoodTestDraft(page, {
      sessionId: TEST_SESSION_ID,
      updatedAt: "2026-07-09T10:00:00.000Z",
      ...AT_SHADOW_SCREEN,
    });

    await page.goto(`/test/${TEST_SESSION_ID}?step=3`);

    await expect(page.getByText("C. 그림자")).toBeVisible();
  });

  test("질문 세트 버전이 다르면 모달로 막고 홈으로 보낸다", async ({
    page,
  }) => {
    await seedMoodTestDraft(page, {
      sessionId: TEST_SESSION_ID,
      updatedAt: "2026-07-09T10:00:00.000Z",
      questionSetVersion: "2026-06-01",
      ...AT_SHADOW_SCREEN,
    });

    await page.goto(`/test/${TEST_SESSION_ID}?step=3`);

    const dialog = page.getByRole("dialog", {
      name: "테스트 내용이 새로 바뀌었어요",
    });
    await expect(dialog).toBeVisible();

    // 뒤 화면은 inert 라 클릭도 포커스도 먹지 않는다. 덮개를 뚫고(force) 카드를 눌러도
    // 선택이 늘지 않아야 한다.
    const moodTest = new MoodTestPage(page);
    await expect(page.locator("[inert]")).toBeAttached();
    await moodTest.unpickedOptions.first().click({ force: true });
    await expect(moodTest.pickedOptions).toHaveCount(0);

    await dialog.getByRole("button", { name: "확인" }).click();
    await page.waitForURL("**/");
  });
});
