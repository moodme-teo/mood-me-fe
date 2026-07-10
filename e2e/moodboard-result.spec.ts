import { expect, test } from "@playwright/test";

import { MOODBOARD, MOODBOARD_ID } from "./fixtures/data";
import { MoodboardResultPage } from "./pages/moodboard-result.page";
import {
  mockLegacyMoodboard,
  mockMoodboard,
  mockMoodboardFailure,
} from "./utils/mock-api";

/**
 * 테스트 대상: 최종 결과물 페이지 (`/moodboard/[moodboardId]` — PRD §5.6)
 *
 * 핵심 여정의 **종착지이자 이 제품의 성공 지표**다. PRODUCT.md 는 성공을 "결과물을 실제로
 * 공유하는 것" 으로 정의한다. 그래서 이 화면에서 공유·내보내기가 깨지면 제품이 목적을
 * 달성하지 못한다 — qa.md 가 지키기로 한 경로의 끝이 여기다.
 *
 * 화면 구성 (§5.6):
 *   상단 — 완성된 무드보드 이미지
 *   무드 성향 이름 — 성향 이름(한글) + 영문명 + 설명. AI 분석의 유형명(미학 코어 × 인생 테마).
 *                    어느 조합에도 맞지 않으면 기본 성향으로 폴백한다 (§9).
 *   무드 성향 그래프 — 막대 스펙트럼 5축 (고요↔활기 · 따뜻↔서늘 · 미니멀↔맥시멀 · 빈티지↔모던 · 현실↔몽환)
 *   액션 — SNS 공유 · 이미지 내보내기(PNG)
 *
 * 결과물은 **두 방식으로 렌더된다.** exportedImageUrl 이 있으면 크롭 에디터가 저장한 평면
 * 이미지를 그대로 보여주고(#102 이후 — 지금 만들어지는 모든 보드), 없으면 뷰어(BoardPreview)가
 * elements 를 Konva 캔버스로 합성한다(#102 이전 보드). 기본 시나리오는 전자를 검증하고,
 * 후자는 레거시 전용 테스트 하나로 커버한다.
 *
 * 재진입 액션 (§5.6): 편집으로 돌아가기(결과 ↔ 편집 왕복) · 처음부터 다시 만들기 · 홈으로.
 *
 * 로그인 유도는 **여기서만** 한다 — 편집의 "완성하고 공유하기" 는 결과(절정) 직전에
 * 로그인으로 가로막지 않는다 (§5.5 엔딩 마찰 제거). 게스트는 곧바로 이 화면에 도착한다.
 *
 * 시나리오:
 * - 편집을 마친 사용자가 크롭 결과와 무드 성향 이름을 확인한다.
 * - "이미지 내보내기" 를 누르면 PNG 다운로드가 일어난다.
 * - "SNS 공유" 를 누르면 링크를 클립보드에 복사하고 토스트를 띄운다.
 * - "편집" 을 누르면 재편집 화면으로 왕복한다.
 * - 레거시 보드는 캔버스로 합성해 보여준다.
 * - 무드보드를 불러오지 못하면 에러 화면을 보여준다.
 *
 * 테스트 성격: smoke (+ 로드 실패·레거시 보드는 edge case)
 *
 * 전제 조건:
 * - GET /api/moodboards/{id} 를 mockMoodboard(크롭 결과) 또는
 *   mockLegacyMoodboard(elements 합성) 로 가로챈다.
 * - "SNS 공유" 는 공유 시트가 아니라 클립보드 복사다 — clipboard-write 권한을 준다.
 *   (권한이 없어도 execCommand 폴백으로 토스트는 뜨지만 실제 경로를 타게 한다)
 * - "편집" 은 버튼이 아니라 링크(`a`)다 — 동작이 아니라 이동이라서다 (PRODUCT.md 접근성).
 *
 * 테스트하지 않는 것:
 * - 무드 성향 5축 그래프의 값 정확성 — 렌더 여부만 화면 구성에 적어 두고 단언하지 않는다.
 *   막대 너비는 AI 가 준 mood_vector 에서 나오므로 mock 값을 되읽는 셈이 된다.
 * - 유형명 폴백 규칙 (§9) — 서버의 AI 분석 소관
 * - 카카오톡 공유·공유용 썸네일/OG 이미지 생성 — 지원 채널이 §13 Open Questions 로 미확정.
 *   OG 메타데이터는 generateMetadata(서버)라 page.route 로 검증할 수 없다.
 * - "처음부터 다시 만들기" — window.confirm 을 띄운다. 브라우저 모달은 자동화를 멈춘다.
 * - 로그인 유도 배너 (§5.5 엔딩 마찰 제거)
 * - 내보낸 PNG 의 픽셀 내용 (visual regression 미도입 — qa.md)
 */
test.describe("결과물 페이지", () => {
  test("크롭 결과와 액션 버튼을 렌더한다", async ({ page }) => {
    await mockMoodboard(page);

    const result = new MoodboardResultPage(page);
    await result.goto(MOODBOARD_ID);

    await expect(result.exportedImage).toBeVisible();
    await expect(
      result.typeName(MOODBOARD.moodProfile.type_name),
    ).toBeVisible();
    await expect(result.exportButton).toBeVisible();
    await expect(result.shareButton).toBeVisible();
  });

  // #102 이전에 저장된 보드. 크롭 결과 이미지가 없어 뷰어가 elements 를 Konva 로 합성한다.
  // 이 분기가 코드에 살아 있는 한 커버리지를 유지한다.
  test("레거시 보드는 캔버스로 합성해 보여준다", async ({ page }) => {
    await mockLegacyMoodboard(page);

    const result = new MoodboardResultPage(page);
    await result.goto(MOODBOARD_ID);

    await expect(result.canvas).toBeVisible();
    await expect(result.exportedImage).toBeHidden();
  });

  test("이미지 내보내기를 누르면 PNG 를 저장한다", async ({ page }) => {
    await mockMoodboard(page);

    const result = new MoodboardResultPage(page);
    await result.goto(MOODBOARD_ID);
    await expect(result.exportedImage).toBeVisible();

    const download = await result.exportPng();

    expect(download.suggestedFilename()).toBe(`mood-me-${MOODBOARD_ID}.png`);
    await expect(result.savedToast).toBeVisible();
  });

  test("SNS 공유를 누르면 링크를 복사한다", async ({ page, context }) => {
    // 복사 실패 시 execCommand 폴백이 있어 권한 없이도 토스트는 뜨지만,
    // 실제 경로(navigator.clipboard)를 타도록 권한을 준다.
    await context.grantPermissions(["clipboard-write"]);
    await mockMoodboard(page);

    const result = new MoodboardResultPage(page);
    await result.goto(MOODBOARD_ID);

    await result.shareButton.click();

    await expect(result.copiedToast).toBeVisible();
  });

  test("편집을 누르면 재편집 화면으로 이동한다", async ({ page }) => {
    await mockMoodboard(page);

    const result = new MoodboardResultPage(page);
    await result.goto(MOODBOARD_ID);

    await result.editLink.click();

    await page.waitForURL(`**/moodboard/${MOODBOARD_ID}/edit`);
  });

  test("무드보드를 불러오지 못하면 에러 화면을 보여준다", async ({ page }) => {
    await mockMoodboardFailure(page);

    const result = new MoodboardResultPage(page);
    await result.goto(MOODBOARD_ID);

    await expect(result.errorMessage).toBeVisible();
  });
});
