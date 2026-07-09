import { expect, test } from "@playwright/test";

import { MOODBOARD, MOODBOARD_ID } from "./fixtures/data";
import { mockMoodboard } from "./fixtures/mock-api";

const RESULT_URL = `/moodboard/${MOODBOARD_ID}`;

test.describe("결과물 페이지", () => {
  test("무드보드와 액션 버튼을 렌더한다", async ({ page }) => {
    await mockMoodboard(page);

    await page.goto(RESULT_URL);

    // BoardPreview 는 Konva Stage 로 <canvas> 를 그린다 (SSR 제외, ssr:false 배럴 경유).
    await expect(page.locator("canvas").first()).toBeVisible();
    await expect(page.getByText(MOODBOARD.moodProfile.type_name)).toBeVisible();
    await expect(
      page.getByRole("button", { name: "이미지 내보내기" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "SNS 공유" })).toBeVisible();
  });

  test("이미지 내보내기를 누르면 PNG 를 저장한다", async ({ page }) => {
    await mockMoodboard(page);
    await page.goto(RESULT_URL);
    await expect(page.locator("canvas").first()).toBeVisible();

    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "이미지 내보내기" }).click();

    expect((await download).suggestedFilename()).toBe(
      `mood-me-${MOODBOARD_ID}.png`,
    );
    await expect(page.getByText("PNG 이미지를 저장했어요.")).toBeVisible();
  });

  test("무드보드를 불러오지 못하면 에러 화면을 보여준다", async ({ page }) => {
    await page.route("**/api/moodboards/*", (route) =>
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          error: { code: "INTERNAL_ERROR", message: "불러오지 못했어요." },
        }),
      }),
    );

    await page.goto(RESULT_URL);

    await expect(page.getByText("결과를 불러오지 못했어요.")).toBeVisible();
  });
});
