import { expect, test } from "@playwright/test";

import { TEST_SESSION_ID } from "./fixtures/data";
import { completeMoodTest } from "./fixtures/flow";
import {
  mockGenerationSuccess,
  mockGuestSession,
  mockSaveMoodTestSession,
} from "./fixtures/mock-api";

test.describe("추구미 테스트", () => {
  test("8개 화면을 완주하면 생성중 화면으로 이동한다", async ({ page }) => {
    await mockGuestSession(page);
    await mockSaveMoodTestSession(page);
    // 도착 직후 생성중 화면이 곧바로 생성을 트리거하므로 함께 mock 한다.
    await mockGenerationSuccess(page);

    await page.goto(`/test/${TEST_SESSION_ID}`);
    await expect(page.getByRole("button", { name: "다음" })).toBeVisible();

    await completeMoodTest(page);

    await page.waitForURL(`**/test/${TEST_SESSION_ID}/generating`);
  });

  test("첫 화면에서 목표치를 채우기 전에는 다음으로 넘어갈 수 없다", async ({
    page,
  }) => {
    await page.goto(`/test/${TEST_SESSION_ID}`);

    const next = page.getByRole("button", { name: "다음" });
    await expect(next).toBeDisabled();

    await page.locator('button[aria-pressed="false"]').first().click();
    await expect(page.locator('p[role="status"]')).toContainText(
      "1 / 12 선택됨",
    );
    await expect(next).toBeDisabled();
  });
});
