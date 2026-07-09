import { expect, test } from "@playwright/test";

import { HomePage } from "./pages/home.page";
import { MoodTestPage } from "./pages/mood-test.page";
import { skipSplash } from "./utils/session";

test.describe("홈 — 첫진입", () => {
  test.beforeEach(async ({ page }) => {
    await skipSplash(page);
  });

  test("게스트가 로그인 없이 첫진입 화면을 본다", async ({ page }) => {
    const home = new HomePage(page);

    await home.goto();

    await expect(home.createButton).toBeVisible();
  });

  test("Create 를 누르면 추구미 테스트로 이동한다", async ({ page }) => {
    const home = new HomePage(page);
    const moodTest = new MoodTestPage(page);

    await home.goto();
    await home.startMoodTest();

    await expect(moodTest.nextButton).toBeVisible();
  });
});
