import { expect, test } from "@playwright/test";

import { TEST_SESSION_ID } from "./fixtures/data";
import { GeneratingPage } from "./pages/generating.page";
import {
  mockCreateGenerationJob,
  mockCreateGenerationJobFailure,
  mockGenerationJobSequence,
} from "./utils/mock-api";

test.describe("생성중 화면", () => {
  test("생성을 시작하면 진행률이 10% 이상에서 채워진다", async ({ page }) => {
    await mockCreateGenerationJob(page);
    await mockGenerationJobSequence(page, [
      { status: "queued", percent: 5 },
      { status: "processing", percent: 60 },
    ]);

    const generating = new GeneratingPage(page);
    await generating.goto(TEST_SESSION_ID);

    await expect(generating.progressBar).toBeVisible();
    // mock 의 percent 는 UI 에 반영되지 않는다 — GeneratingPage.readPercent 주석 참조.
    await expect
      .poll(() => generating.readPercent(), { timeout: 5_000 })
      .toBeGreaterThanOrEqual(10);

    const first = await generating.readPercent();
    await expect
      .poll(() => generating.readPercent(), { timeout: 5_000 })
      .toBeGreaterThan(first);
  });

  test("생성이 완료되면 편집 화면으로 이동한다", async ({ page }) => {
    await mockCreateGenerationJob(page);
    await mockGenerationJobSequence(page, [
      { status: "processing", percent: 10 },
      { status: "completed", percent: 100 },
    ]);

    const generating = new GeneratingPage(page);
    await generating.goto(TEST_SESSION_ID);

    await generating.waitForEdit(TEST_SESSION_ID);
  });

  test("job 이 실패하면 에러 화면과 다시 시도 버튼을 보여준다", async ({
    page,
  }) => {
    await mockCreateGenerationJob(page);
    await mockGenerationJobSequence(page, [{ status: "failed", percent: 0 }]);

    const generating = new GeneratingPage(page);
    await generating.goto(TEST_SESSION_ID);

    await expect(generating.errorHeading).toBeVisible();
    await expect(generating.retryButton).toBeVisible();
  });

  test("생성 요청 자체가 실패해도 에러 화면을 보여준다", async ({ page }) => {
    await mockCreateGenerationJobFailure(page);

    const generating = new GeneratingPage(page);
    await generating.goto(TEST_SESSION_ID);

    await expect(generating.errorHeading).toBeVisible();
  });

  test("에러 화면에서 다시 시도하면 폴링을 재개한다", async ({ page }) => {
    await mockCreateGenerationJob(page);
    await mockGenerationJobSequence(page, [
      { status: "failed", percent: 0 },
      { status: "processing", percent: 40 },
    ]);

    const generating = new GeneratingPage(page);
    await generating.goto(TEST_SESSION_ID);
    await expect(generating.errorHeading).toBeVisible();

    await generating.retry();

    await expect(generating.errorHeading).toBeHidden();
    await expect(generating.progressBar).toBeVisible();
  });
});
