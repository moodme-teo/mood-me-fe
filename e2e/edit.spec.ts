import { expect, test } from "@playwright/test";

import { TEST_SESSION_ID } from "./fixtures/data";
import { EditPage } from "./pages/edit.page";
import {
  mockMoodboard,
  mockSaveMoodboard,
  mockSaveMoodboardFailure,
} from "./utils/mock-api";

/**
 * 테스트 대상: 생성 직후 편집 (/test/[sessionId]/edit) — 아직 실행하지 않는다.
 *
 * 시나리오:
 * - 생성이 끝난 사용자가 편집 화면에 진입해 크롭을 다듬고 완성한다.
 * - job 이 아직 완료되지 않았다면 생성중 화면으로 되돌아간다.
 *
 * 테스트 성격: smoke (+ 미완료 job redirect 는 edge case)
 *
 * 전제 조건 — 아직 충족되지 않아 test.fixme 로 막혀 있다:
 * - 이 화면의 서버 컴포넌트는 getLatestGenerationJob() → createServiceClient() 로
 *   Supabase service role 클라이언트를 직접 호출한다. 클라이언트 fetch 가 아니라서
 *   page.route 로 가로챌 수 없고, E2E 는 시크릿 없이 도는 것이 전제라 진입 자체가 500 이다
 *   (서버 로그: `Error: supabaseUrl is required.`).
 * - getMoodboardById() 는 canUseSupabaseService() 로 env 를 확인해 mock 으로 폴백하지만
 *   getLatestGenerationJob() 에는 같은 가드가 없다.
 *
 * ✅ 검증됨 (2026-07-10) — 아래 스펙은 "언젠가 되겠지" 가 아니라 실제로 통과한다.
 *   getLatestGenerationJob() 에 getMoodboardById() 와 같은 env 가드를 임시로 붙이고
 *   (canUseSupabaseService() 가 false 면 completed mock job 반환) 돌린 결과:
 *   **8개 중 7개 통과.** 통과하지 못한 1개는 아래 redirect 테스트뿐이며, 그건 mock 이
 *   항상 completed 를 주기 때문이지 스펙이 틀려서가 아니다.
 *   가드는 제품 코드를 깨끗이 두기 위해 커밋에 포함하지 않았다.
 *
 * 해제하려면 둘 중 하나가 필요하다:
 *   (a) getLatestGenerationJob 에 env 가드를 영구히 두어 mock job 으로 폴백한다
 *       — 가장 싸다. get-moodboard.ts · list.ts · app/page.tsx 에 이미 같은 가드가 있다.
 *   (b) 테스트용 Supabase 인스턴스에 generation job 을 seed 한다
 *       — 제품 코드는 안 건드리지만 CI 에 시크릿이 필요해져 하네스의 전제가 깨진다.
 * 해제할 때 아래 test.fixme(true) 한 줄만 지우면 7개가 곧바로 산다.
 *
 * 테스트하지 않는 것:
 * - 크롭 인터랙션 자체 — 같은 MoodboardCropEditor 를 렌더하므로 실제 검증은
 *   moodboard-edit.spec.ts 가 맡는다. 여기서는 job 조회·redirect 경로만 본다.
 */
test.describe("편집 화면", () => {
  test.fixme(
    true,
    "서버 컴포넌트가 Supabase 를 직접 호출해 mock 불가 — Refs #67",
  );

  test("완료된 job 이면 캔버스와 크롭 도구를 렌더한다", async ({ page }) => {
    const edit = new EditPage(page);
    await edit.goto(TEST_SESSION_ID);

    await expect(edit.canvas).toBeVisible();
    await expect(edit.tab("도형")).toHaveAttribute("aria-pressed", "true");
    await expect(edit.shape("원")).toHaveAttribute("aria-pressed", "true");
    await expect(edit.saveButton).toBeEnabled();
  });

  // 위 (a) 로 해제해도 이 테스트만은 계속 막힌다 — env 폴백 mock 은 항상 completed 를
  // 돌려주므로 redirect 경로를 만들 수 없다. completed 가 아닌 job(또는 job 없음)을
  // seed 할 수단이 따로 있어야 한다.
  test("job 이 완료되지 않았으면 생성중 화면으로 되돌린다", async ({
    page,
  }) => {
    const edit = new EditPage(page);
    await edit.goto(TEST_SESSION_ID);

    await edit.waitForGeneratingRedirect(TEST_SESSION_ID);
  });

  test("도형을 고르면 활성 도형이 바뀐다", async ({ page }) => {
    const edit = new EditPage(page);
    await edit.goto(TEST_SESSION_ID);

    await edit.selectShape("하트");

    await expect(edit.shape("하트")).toHaveAttribute("aria-pressed", "true");
    await expect(edit.shape("원")).toHaveAttribute("aria-pressed", "false");
  });

  test("배경을 흰색으로 바꾸면 투명이 해제된다", async ({ page }) => {
    const edit = new EditPage(page);
    await edit.goto(TEST_SESSION_ID);

    await edit.openTab("배경");
    await edit.whiteBackgroundButton.click();

    await expect(edit.whiteBackgroundButton).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(edit.transparentBackgroundButton).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  test("확대한 뒤 구도 초기화로 되돌린다", async ({ page }) => {
    const edit = new EditPage(page);
    await edit.goto(TEST_SESSION_ID);
    await expect(edit.canvas).toBeVisible();

    await edit.openImageTabWhenReady();
    await edit.setZoom(2);
    await expect(edit.zoomSlider).toHaveValue("2");

    await edit.resetButton.click();

    await expect(edit.zoomSlider).toHaveValue("1");
  });

  test("완성하고 공유하기를 누르면 저장 후 결과물 페이지로 간다", async ({
    page,
  }) => {
    await mockMoodboard(page);
    await mockSaveMoodboard(page);

    const edit = new EditPage(page);
    await edit.goto(TEST_SESSION_ID);
    await expect(edit.canvas).toBeVisible();

    await edit.openSaveSheet();
    await edit.complete();

    // moodboardId 는 서버가 진입할 때마다 새로 발급하므로 URL 패턴으로만 확인한다.
    await edit.waitForResult();
  });

  test("저장에 실패하면 토스트를 띄우고 편집 화면에 머문다", async ({
    page,
  }) => {
    await mockSaveMoodboardFailure(page);

    const edit = new EditPage(page);
    await edit.goto(TEST_SESSION_ID);
    await expect(edit.canvas).toBeVisible();

    await edit.openSaveSheet();
    await edit.complete();

    await expect(edit.toast).toContainText("저장하지 못했어요.");
    await expect(edit.completeButton).toBeEnabled();
  });

  test("뒤로를 누르면 나가기 확인 다이얼로그를 띄운다", async ({ page }) => {
    const edit = new EditPage(page);
    await edit.goto(TEST_SESSION_ID);

    await edit.backButton.click();

    await expect(edit.leaveDialog).toBeVisible();

    await edit.leaveCancelButton.click();

    await expect(edit.leaveDialog).toBeHidden();
    await expect(edit.canvas).toBeVisible();
  });
});
