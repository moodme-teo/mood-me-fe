import { expect, test } from "@playwright/test";

import {
  EXPORTED_IMAGE_QUADRANTS,
  MOODBOARD,
  MOODBOARD_ANALYSIS_FAILED,
  MOODBOARD_ANALYSIS_PROCESSING,
  MOODBOARD_ID,
} from "./fixtures/data";
import { MoodboardResultPage } from "./pages/moodboard-result.page";
import {
  mockLegacyMoodboard,
  mockMoodboard,
  mockMoodboardAnalysisFailed,
  mockMoodboardFailure,
  mockMoodboardSequence,
  mockRetryAnalysis,
} from "./utils/mock-api";
import { downloadToDataUrl, readImagePixels } from "./utils/pixels";

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
 * - "이미지 내보내기" 를 누르면 PNG 다운로드가 일어나고, 내려받은 파일의 픽셀이
 *   저장된 크롭 결과와 같다 (투명값 포함).
 * - "SNS 공유" 를 누르면 링크를 클립보드에 복사하고 토스트를 띄운다.
 * - "편집" 을 누르면 재편집 화면으로 왕복한다.
 * - "다시 만들기" 는 확인 다이얼로그를 거쳐야 새 테스트로 간다.
 * - 레거시 보드는 캔버스로 합성해 보여준다.
 * - 무드보드를 불러오지 못하면 에러 화면을 보여준다.
 *
 * 테스트 성격: smoke (+ 로드 실패·레거시 보드는 edge case)
 *
 * 전제 조건:
 * - GET /api/moodboards/{id} 를 mockMoodboard(크롭 결과) 또는
 *   mockLegacyMoodboard(elements 합성) 로 가로챈다.
 * - exportedImageUrl 은 DB 컬럼(`exported_image_data_url`) 그대로 data URL 이다. 그래서
 *   내보내기가 저장값을 다시 인코딩하지 않고 그대로 내려받는지 픽셀로 확인할 수 있다.
 * - "SNS 공유" 는 공유 시트가 아니라 클립보드 복사다 — clipboard-write 권한을 준다.
 *   (권한이 없어도 execCommand 폴백으로 토스트는 뜨지만 실제 경로를 타게 한다)
 * - "편집" 은 버튼이 아니라 링크(`a`)다 — 동작이 아니라 이동이라서다 (PRODUCT.md 접근성).
 *
 * 테스트하지 않는 것:
 * - 무드 성향 5축 그래프의 값 정확성 — 렌더 여부만 화면 구성에 적어 두고 단언하지 않는다.
 *   막대 너비는 AI 가 준 mood_vector 에서 나오므로 mock 값을 되읽는 셈이 된다.
 * - 유형명 폴백 규칙 (§9) — 서버의 AI 분석 소관
 * - **분석 실패 시의 그래프 자리 재시도** (§5.6 · §10.3) — 아직 없다. 분석 실패와 "분석이
 *   아직 도는 중" 을 구별할 `analysis_status` 가 없어서 화면이 둘을 같게 취급한다
 *   ([#122](https://github.com/moodme-teo/mood-me-fe/issues/122)). 컬럼이 생기면 여기에 붙인다.
 * - 카카오톡 공유·공유용 썸네일/OG 이미지 — **만들지 않기로 확정됐다** (§13 Q5 해소).
 *   공유는 링크 복사뿐이고, 그건 위에서 검증한다.
 * - 로그인 유도 배너 (§5.5 엔딩 마찰 제거)
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

  // 내보내기는 저장된 크롭 결과를 **그대로** 내려줘야 한다 (exportRef 가 exportedImageUrl 을
  // 그대로 돌려준다). 중간에 캔버스를 거쳐 재인코딩되면 투명 사분면이 검게 죽으므로,
  // alpha 까지 포함해 사분면 색을 단언하면 그 회귀가 곧바로 잡힌다.
  test("내려받은 PNG 는 저장된 크롭 결과와 픽셀이 같다", async ({ page }) => {
    await mockMoodboard(page);

    const result = new MoodboardResultPage(page);
    await result.goto(MOODBOARD_ID);
    await expect(result.exportedImage).toBeVisible();

    const download = await result.exportPng();
    const dataUrl = await downloadToDataUrl(download);

    const pixels = await readImagePixels(
      page,
      dataUrl,
      EXPORTED_IMAGE_QUADRANTS.map((quadrant) => quadrant.point),
    );

    expect(pixels).toEqual(
      EXPORTED_IMAGE_QUADRANTS.map((quadrant) => quadrant.color),
    );
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

  // 되돌릴 수 없는 행동이라 확인을 한 번 받는다. window.confirm 이 아니라 인앱
  // 다이얼로그다 — 브라우저 모달은 스크립트를 멈추고 스타일도 제어할 수 없다.
  test("다시 만들기는 확인을 받고 새 테스트로 간다", async ({ page }) => {
    await mockMoodboard(page);

    const result = new MoodboardResultPage(page);
    await result.goto(MOODBOARD_ID);

    await result.restartButton.click();
    await expect(result.restartDialog).toBeVisible();

    await result.restartConfirmButton.click();

    // sessionId 는 클라이언트가 randomUUID 로 새로 만든다 — 값을 미리 알 수 없다.
    await page.waitForURL(/\/test\/[0-9a-f-]{36}$/);
  });

  test("다시 만들기를 취소하면 결과물에 머문다", async ({ page }) => {
    await mockMoodboard(page);

    const result = new MoodboardResultPage(page);
    await result.goto(MOODBOARD_ID);

    await result.restartButton.click();
    await result.restartCancelButton.click();

    await expect(result.restartDialog).toBeHidden();
    await expect(result.exportedImage).toBeVisible();
    expect(new URL(page.url()).pathname).toBe(`/moodboard/${MOODBOARD_ID}`);
  });

  test("무드보드를 불러오지 못하면 에러 화면을 보여준다", async ({ page }) => {
    await mockMoodboardFailure(page);

    const result = new MoodboardResultPage(page);
    await result.goto(MOODBOARD_ID);

    await expect(result.errorMessage).toBeVisible();
  });

  test("분석이 실패하면 그래프 대신 재시도 버튼을 보여준다", async ({
    page,
  }) => {
    await mockMoodboardAnalysisFailed(page);

    const result = new MoodboardResultPage(page);
    await result.goto(MOODBOARD_ID);

    // 이미지·저장·공유는 분석 실패와 무관하게 정상이어야 한다 (#122).
    await expect(result.exportedImage).toBeVisible();
    await expect(result.analysisFailedHeading).toBeVisible();
    await expect(result.retryAnalysisButton).toBeVisible();
    await expect(result.moodSpectrumHeading).toBeHidden();
  });

  test("분석 다시 시도가 완료되면 그래프를 보여준다", async ({ page }) => {
    await mockRetryAnalysis(page);
    await mockMoodboardSequence(page, [
      MOODBOARD_ANALYSIS_FAILED,
      MOODBOARD_ANALYSIS_PROCESSING,
      MOODBOARD,
    ]);

    const result = new MoodboardResultPage(page);
    await result.goto(MOODBOARD_ID);
    await expect(result.retryAnalysisButton).toBeVisible();

    await result.retryAnalysisButton.click();

    await expect(result.moodSpectrumHeading).toBeVisible({ timeout: 15_000 });
    await expect(result.analysisFailedHeading).toBeHidden();
  });
});
