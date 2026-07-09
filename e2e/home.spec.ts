import { expect, test } from "@playwright/test";

import { skipSplash } from "./fixtures/mock-api";

const CREATE_CTA = "무드보드 만들기 — 추구미 테스트 시작하기";

test.describe("홈 — 첫진입", () => {
  test.beforeEach(async ({ page }) => {
    await skipSplash(page);
  });

  test("게스트가 로그인 없이 첫진입 화면을 본다", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("button", { name: CREATE_CTA })).toBeVisible();
  });

  test("Create 를 누르면 추구미 테스트로 이동한다", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: CREATE_CTA }).click();

    await page.waitForURL(/\/test\/[0-9a-f-]{36}$/);
    await expect(page.getByRole("button", { name: "다음" })).toBeVisible();
  });
});
