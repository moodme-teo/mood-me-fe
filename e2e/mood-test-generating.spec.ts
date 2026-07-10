import { expect, test } from "@playwright/test";

import { TEST_SESSION_ID } from "./fixtures/data";
import { GeneratingPage } from "./pages/mood-test-generating.page";
import {
  mockCreateGenerationJob,
  mockCreateGenerationJobFailure,
  mockGenerationJobSequence,
} from "./utils/mock-api";

/**
 * 테스트 대상: 무드보드 생성중 (`/test/[sessionId]/generating` — PRD §5.4)
 * 생성 파이프라인 원본: docs/work/todo/moodboard/moodboard-creation.md
 *
 * 추구미 테스트의 마지막 화면("무드보드 생성하기")에서 넘어오는 대기 화면이다. PRD의
 * 설계 사상은 **로딩을 기다림이 아니라 "채워지는 설렘"으로** 만드는 것이다(PRODUCT.md
 * 디자인 원칙 2). 그래서 이 화면의 진행률은 서버 진실이 아니라 **연출**이다.
 *
 * 서버가 실제로 하는 일 (E2E 는 이 중 아무것도 실행하지 않는다):
 *   여정 → computePersonaResult(결정론적 순수 함수) → 코어/테마 페르소나 비율
 *        → 비율 블록 + 여정 해시로 고른 레이아웃 1종 → gpt-image-2 프롬프트 조립
 *        → Elice 프록시 POST /v1/images/generations (1024x1536 · quality=medium)
 *
 * 이 호출은 실측 **65~70초**가 걸리고 크레딧을 태운다. 동기 호출이라 백엔드는 세밀한
 * 진행률을 줄 수 없어서 job 은 사실상 `processing 10%` → `completed 100%` 두 값만 오간다.
 * 그 공백을 useGenerationPolling 이 시간 기준으로 메운다 — 10% 에서 시작해 92% 를 상한으로
 * 차오르다가, `completed` 신호를 받으면 그때 100% 로 점프한다(POLL_INTERVAL_MS = 2000).
 *
 * 그래서 **mock 의 percent 값은 화면에 반영되지 않는다.** 진행률 단언은 "증가한다" 만 가능하다.
 *
 * 시나리오:
 * - 생성을 시작하면 프로그레스바가 10% 이상에서 채워지기 시작하고 계속 증가한다.
 * - job 이 completed 가 되면 자동으로 편집 화면으로 이동한다.
 * - job 이 failed 이거나 생성 요청 자체가 실패하면 에러 화면 + "다시 시도" 가 뜬다 (§5.4 예외).
 * - 다시 시도하면 추구미 테스트 결과를 유지한 채 폴링을 재개한다.
 *
 * 테스트 성격: smoke (+ 실패·재시도는 edge case)
 *
 * 전제 조건:
 * - E2E 는 Elice AX 를 호출하지 않는다 (ai.md · qa.md). `ELICE_MODEL_API_KEY` 는 CI 에 없다.
 *   job 상태 전이를 mockGenerationJobSequence 로 queued → processing → completed/failed 로 흉내낸다.
 * - ai.md 원칙대로 실패 경로를 성공 경로와 한 세트로 함께 mock 한다 — 생성 호출은
 *   실패를 전제로 구현하기 때문이다.
 *
 * 테스트하지 않는 것:
 * - progressPercent 의 절대값 — 위 이유로 클라이언트 연출이다.
 *   (mood-test-generating.page.ts 의 readPercent 주석 참조)
 * - 상태 메시지("AI가 그리는 중...") 로테이션 문구
 * - 생성 파이프라인 자체 — 페르소나 비율 산출, 프롬프트 조립, gpt-image-2 응답.
 *   전부 서버 전용이고 비결정적이며 유료다. 결정론적인 computePersonaResult 는
 *   순수 함수라 붙인다면 E2E 가 아니라 unit test 자리다.
 * - 이동한 편집 화면의 렌더 — 서버 컴포넌트가 Supabase 를 직접 부른다 (edit.spec.ts)
 */
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
