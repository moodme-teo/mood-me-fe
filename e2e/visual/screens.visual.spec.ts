import { expect, test } from "@playwright/test";

import { MOODBOARD_ID, TEST_SESSION_ID } from "../fixtures/data";
import { EditPage } from "../pages/edit.page";
import { HomePage } from "../pages/home.page";
import { GeneratingPage } from "../pages/mood-test-generating.page";
import { MoodboardResultPage } from "../pages/moodboard-result.page";
import {
  mockCreateGenerationJob,
  mockGenerationJobSequence,
  mockMoodboard,
  mockMoodboards,
} from "../utils/mock-api";
import { seedGuestSession, skipSplash } from "../utils/session";

/**
 * 테스트 대상: 결정론적인 화면들의 시각 회귀 (docs/convention/qa.md §Visual regression)
 *
 * **CI 에서 돌지 않는다.** `npm run e2e` 는 `--project=mobile-chromium` 이고 이 파일은
 * `visual` 프로젝트에만 잡힌다. 스크린샷 비교는 폰트 렌더링·GPU 래스터라이즈 차이로
 * 쉽게 깨져서, 러너 환경을 고정하기 전까지 CI 스냅샷은 신호가 아니라 소음이다.
 *
 * 쓰는 법:
 *   npm run e2e:visual          # 기준 이미지와 비교 (없으면 만들고 한 번 실패한다)
 *   npm run e2e:visual:update   # UI 를 의도적으로 바꿨을 때 기준을 갱신
 *
 * **기준 이미지는 커밋하지 않는다** (`e2e/visual/__screenshots__/` 는 gitignore).
 * 폰트·GPU 래스터라이즈가 기기마다 달라 남의 기준과는 비교할 수 없고, UI 를 만질 때마다
 * 갱신되어 저장소만 무거워진다. 각자 자기 기기에서 만들어 쓰는 로컬 도구다.
 *
 * 이 화면들만 찍는 이유 — 전부 고정 mock 위에서 렌더되어 매번 같은 픽셀이 나온다:
 * - 홈(첫진입): 저장 보드 0개. 스플래시를 건너뛰어 phase 를 entry 로 고정한다.
 * - 홈(History): mockMoodboards 고정 목록.
 * - 생성중 에러: job `failed` 고정.
 * - 결과물: mockMoodboard 고정 응답.
 * - 크롭 에디터: useCropEditor 의 DEFAULT_STATE (도형 탭 · 크롭 안 함 · 투명 배경).
 *
 * 찍지 않는 것:
 * - **생성중 진행률 화면** — useGenerationPolling 이 시간 기준으로 막대를 채운다.
 *   같은 순간을 두 번 잡을 수 없어 스냅샷 대상이 아니다 (mood-test-generating.spec.ts).
 * - **추구미 테스트 화면** — 카드 36장이 그리드에 깔려 diff 가 커지는 데 비해,
 *   레이아웃 회귀는 홈·결과물에서 이미 잡힌다.
 * - **AI 생성 이미지** — 매번 다르다. fixtures 의 BASE_IMAGE_URL 만 쓴다.
 */
test.describe("시각 회귀", () => {
  test("홈 — 첫진입(저장 보드 0개)", async ({ page }) => {
    await skipSplash(page);

    const home = new HomePage(page);
    await home.goto();
    await expect(home.createButton).toBeVisible();

    await expect(page).toHaveScreenshot("home-first-entry.png");
  });

  test("홈 — History", async ({ page }) => {
    await skipSplash(page);
    // 이 시드가 없으면 목록 조회 자체가 일어나지 않아 첫진입 화면이 그대로 남는다.
    await seedGuestSession(page);
    await mockMoodboards(page);

    const home = new HomePage(page);
    await home.goto();
    await expect(home.historyHeading).toBeVisible();
    // 카운트까지 떠야 목록 로딩이 끝난 것이다 — 스켈레톤을 찍지 않는다.
    await expect(home.moodboardCount).toBeVisible();

    await expect(page).toHaveScreenshot("home-history.png");
  });

  test("생성중 — 에러", async ({ page }) => {
    await mockCreateGenerationJob(page);
    await mockGenerationJobSequence(page, [{ status: "failed", percent: 0 }]);

    const generating = new GeneratingPage(page);
    await generating.goto(TEST_SESSION_ID);
    await expect(generating.errorHeading).toBeVisible();

    await expect(page).toHaveScreenshot("generating-error.png");
  });

  test("결과물", async ({ page }) => {
    await mockMoodboard(page);

    const result = new MoodboardResultPage(page);
    await result.goto(MOODBOARD_ID);
    await expect(result.exportedImage).toBeVisible();

    await expect(page).toHaveScreenshot("moodboard-result.png");
  });

  test("크롭 에디터 — 진입 기본 상태", async ({ page }) => {
    await seedGuestSession(page);

    const edit = new EditPage(page);
    await edit.gotoSaved(MOODBOARD_ID);

    await expect(edit.canvas).toBeVisible();
    await expect(edit.shape("크롭 안 함")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    // Konva 는 다음 프레임에 그린다. aria-pressed 가 켜진 순간엔 캔버스가 아직 비어 있다.
    await edit.waitForPreviewPaint();

    await expect(page).toHaveScreenshot("crop-editor-default.png");
  });
});
