import { expect, test } from "@playwright/test";

import { TEST_SESSION_ID } from "./fixtures/data";
import {
  mockCreateGenerationJob,
  mockCreateGenerationJobFailure,
  mockGenerationJobSequence,
} from "./fixtures/mock-api";

const GENERATING_URL = `/test/${TEST_SESSION_ID}/generating`;
const ERROR_HEADING = "앗, 생성이 잠깐 멈췄어요";

// 진행률은 서버 job 의 progressPercent 가 아니라 클라이언트가 시간 기준으로 채우는 연출이다
// (useGenerationPolling.ts — 10% 에서 시작해 92% 를 상한으로 채우고, completed 신호에서 100%).
// 그래서 mock 응답의 percent 값을 그대로 단언하지 않고 "증가한다"만 검증한다.
async function readPercent(page: import("@playwright/test").Page) {
  const value = await page
    .getByRole("progressbar")
    .getAttribute("aria-valuenow");
  return Number(value);
}

test.describe("생성중 화면", () => {
  test("생성을 시작하면 진행률이 10% 이상에서 채워진다", async ({ page }) => {
    await mockCreateGenerationJob(page);
    await mockGenerationJobSequence(page, [
      { status: "queued", percent: 5 },
      { status: "processing", percent: 60 },
    ]);

    await page.goto(GENERATING_URL);

    const bar = page.getByRole("progressbar");
    await expect(bar).toBeVisible();
    await expect
      .poll(() => readPercent(page), { timeout: 5_000 })
      .toBeGreaterThanOrEqual(10);

    const first = await readPercent(page);
    await expect
      .poll(() => readPercent(page), { timeout: 5_000 })
      .toBeGreaterThan(first);
  });

  // 편집 화면(/test/[sessionId]/edit)은 서버 컴포넌트가 getLatestGenerationJob() 으로 Supabase
  // service client 를 직접 호출해서, page.route 로는 mock 되지 않는다. 여기서는 "이동이 일어나는지"
  // 까지만 검증하고 편집 화면 렌더 검증은 후속 과제로 둔다 (테스트 DB seed 또는 테스트 seam 필요).
  test("생성이 완료되면 편집 화면으로 이동한다", async ({ page }) => {
    await mockCreateGenerationJob(page);
    await mockGenerationJobSequence(page, [
      { status: "processing", percent: 10 },
      { status: "completed", percent: 100 },
    ]);

    await page.goto(GENERATING_URL);

    await page.waitForURL(`**/test/${TEST_SESSION_ID}/edit`);
  });

  test("job 이 실패하면 에러 화면과 다시 시도 버튼을 보여준다", async ({
    page,
  }) => {
    await mockCreateGenerationJob(page);
    await mockGenerationJobSequence(page, [{ status: "failed", percent: 0 }]);

    await page.goto(GENERATING_URL);

    await expect(page.getByText(ERROR_HEADING)).toBeVisible();
    await expect(page.getByRole("button", { name: "다시 시도" })).toBeVisible();
  });

  test("생성 요청 자체가 실패해도 에러 화면을 보여준다", async ({ page }) => {
    await mockCreateGenerationJobFailure(page);

    await page.goto(GENERATING_URL);

    await expect(page.getByText(ERROR_HEADING)).toBeVisible();
  });

  test("에러 화면에서 다시 시도하면 폴링을 재개한다", async ({ page }) => {
    await mockCreateGenerationJob(page);
    await mockGenerationJobSequence(page, [
      { status: "failed", percent: 0 },
      { status: "processing", percent: 40 },
    ]);

    await page.goto(GENERATING_URL);
    await expect(page.getByText(ERROR_HEADING)).toBeVisible();

    await page.getByRole("button", { name: "다시 시도" }).click();

    await expect(page.getByText(ERROR_HEADING)).toBeHidden();
    await expect(page.getByRole("progressbar")).toBeVisible();
  });
});
