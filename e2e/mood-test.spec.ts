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
 * 시나리오:
 * - 8화면을 완주하면 여정(Journey)이 서버로 전송되고 생성중 화면으로 넘어간다.
 * - 각 화면은 목표 선택 수를 채우기 전까지 "다음" 이 비활성이다 (§5.3 선택 규칙).
 *   충족 전에는 "N / M 선택됨" 만 갱신된다.
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
 * - 뒤로가기 시 이전 선택값 유지와, 상위 단계를 고치면 하위 단계가 초기화되는 규칙
 *   (commitScreen 의 sameSet 분기 — 조합이 많아 E2E 로 확인할 대상이 아니다)
 */
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
});
