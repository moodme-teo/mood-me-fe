import { expect, test } from "@playwright/test";

import { MOODBOARD, MOODBOARD_ID } from "./fixtures/data";
import { MoodboardResultPage } from "./pages/moodboard-result.page";
import { mockMoodboard, mockMoodboardFailure } from "./utils/mock-api";

test.describe("결과물 페이지", () => {
  test("무드보드와 액션 버튼을 렌더한다", async ({ page }) => {
    await mockMoodboard(page);

    const result = new MoodboardResultPage(page);
    await result.goto(MOODBOARD_ID);

    await expect(result.canvas).toBeVisible();
    await expect(
      result.typeName(MOODBOARD.moodProfile.type_name),
    ).toBeVisible();
    await expect(result.exportButton).toBeVisible();
    await expect(result.shareButton).toBeVisible();
  });

  test("이미지 내보내기를 누르면 PNG 를 저장한다", async ({ page }) => {
    await mockMoodboard(page);

    const result = new MoodboardResultPage(page);
    await result.goto(MOODBOARD_ID);
    await expect(result.canvas).toBeVisible();

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
