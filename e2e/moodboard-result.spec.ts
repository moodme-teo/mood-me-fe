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

  test("무드보드를 불러오지 못하면 에러 화면을 보여준다", async ({ page }) => {
    await mockMoodboardFailure(page);

    const result = new MoodboardResultPage(page);
    await result.goto(MOODBOARD_ID);

    await expect(result.errorMessage).toBeVisible();
  });
});
