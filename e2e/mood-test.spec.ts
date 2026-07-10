import { expect, test } from "@playwright/test";

import { TEST_SESSION_ID } from "./fixtures/data";
import { MoodTestPage } from "./pages/mood-test.page";
import {
  mockGenerationSuccess,
  mockGuestSession,
  mockSaveMoodTestSession,
} from "./utils/mock-api";

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
 * - 마지막 화면에서 "다음" 은 "무드보드 생성하기" 로 바뀐다.
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
 * - 프리뷰 보드 (BuildBoardPreview) — **제품 결정 보류 중.** 채워지는 내용이 의도와 달라
 *   무엇을 넣을지 논의가 필요하다. 확정 전에 단언하면 결정을 테스트로 굳혀버린다.
 *   (연출 자체도 reducedMotion 으로 꺼져 있어 지금은 검증 대상이 아니다)
 * - 초기화 규칙의 모든 조합 (담기·덜어내기·그림자·전환이 각각 무엇을 지우는지) —
 *   commitScreen 은 순수 함수라 조합 폭발은 unit test 자리다. 여기서는 대표 경로 하나로
 *   "확인을 거친다 · 실제로 비워진다" 만 본다.
 * - 드래프트 버전 불일치·여러 탭 동시 편집·localStorage 접근 불가 — 드래프트에 아직
 *   schemaVersion 이 없다. 버전 필드가 생긴 뒤에 붙인다.
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
