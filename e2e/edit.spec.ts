import { expect, test } from "@playwright/test";

import { TEST_SESSION_ID } from "./fixtures/data";
import { EditPage } from "./pages/edit.page";
import { mockSaveMoodboard, mockSaveMoodboardFailure } from "./utils/mock-api";

/**
 * 편집 화면(/test/[sessionId]/edit) — 아직 실행하지 않는다.
 *
 * 이 화면의 서버 컴포넌트는 getLatestGenerationJob() → createServiceClient() 로
 * Supabase service role 클라이언트를 직접 호출한다. 클라이언트 fetch 가 아니라서
 * page.route 로 가로챌 수 없고, E2E 는 시크릿 없이 도는 것이 전제라 진입 자체가 500 이다
 * (서버 로그: `Error: supabaseUrl is required.`).
 *
 * 그래서 스펙만 정의해 두고 test.fixme 로 막아 둔다. 아래 둘 중 하나가 붙으면 해제한다.
 *   (a) 테스트용 Supabase 인스턴스에 generation job 을 seed 한다
 *   (b) env 로 켜는 테스트 seam 을 두어 job 조회를 대체한다
 *
 * 해제할 때 test.fixme 를 지우고, beforeEach 에 완료된 job seed 를 추가하면 된다.
 * 나머지 인터랙션은 모두 클라이언트라서 이 파일의 단언은 그대로 살아 있어야 한다.
 */
test.describe("편집 화면", () => {
  test.fixme(
    true,
    "서버 컴포넌트가 Supabase 를 직접 호출해 mock 불가 — Refs #67",
  );

  test("완료된 job 이면 캔버스와 도구 바를 렌더한다", async ({ page }) => {
    const edit = new EditPage(page);
    await edit.goto(TEST_SESSION_ID);

    await expect(edit.canvas).toBeVisible();
    await expect(edit.tool("이동")).toHaveAttribute("aria-pressed", "true");
    await expect(edit.completeButton).toBeEnabled();
  });

  // 다른 테스트와 달리 completed 가 아닌 job(또는 job 없음)을 seed 해야 한다.
  test("job 이 완료되지 않았으면 생성중 화면으로 되돌린다", async ({
    page,
  }) => {
    const edit = new EditPage(page);
    await edit.goto(TEST_SESSION_ID);

    await edit.waitForGeneratingRedirect(TEST_SESSION_ID);
  });

  test("도구를 고르면 활성 상태가 바뀐다", async ({ page }) => {
    const edit = new EditPage(page);
    await edit.goto(TEST_SESSION_ID);

    await edit.selectTool("펜");

    await expect(edit.tool("펜")).toHaveAttribute("aria-pressed", "true");
    await expect(edit.tool("이동")).toHaveAttribute("aria-pressed", "false");
  });

  test("스티커를 추가하면 이동 도구로 돌아온다", async ({ page }) => {
    const edit = new EditPage(page);
    await edit.goto(TEST_SESSION_ID);

    await edit.selectTool("스티커");
    await edit.sticker("은빛 별").click();

    // addSticker 가 setTool("move") 로 되돌린다 — 추가 직후 바로 옮길 수 있게.
    await expect(edit.tool("이동")).toHaveAttribute("aria-pressed", "true");
  });

  test("텍스트 박스를 추가하고 내용을 입력한다", async ({ page }) => {
    const edit = new EditPage(page);
    await edit.goto(TEST_SESSION_ID);

    await edit.selectTool("글자");
    await edit.addTextButton.click();
    await edit.textContentInput.fill("조용한 확신");

    await expect(edit.textContentInput).toHaveValue("조용한 확신");
  });

  test("Undo 로 방금 추가한 요소를 되돌린다", async ({ page }) => {
    const edit = new EditPage(page);
    await edit.goto(TEST_SESSION_ID);

    await expect(edit.undoButton).toBeDisabled();

    await edit.selectTool("스티커");
    await edit.sticker("은빛 별").click();
    await expect(edit.undoButton).toBeEnabled();

    await edit.undoButton.click();

    await expect(edit.undoButton).toBeDisabled();
  });

  test("완성하고 공유하기를 누르면 저장 후 결과물 페이지로 간다", async ({
    page,
  }) => {
    await mockSaveMoodboard(page);

    const edit = new EditPage(page);
    await edit.goto(TEST_SESSION_ID);
    await expect(edit.canvas).toBeVisible();

    await edit.complete();

    await edit.waitForResult();
  });

  test("저장에 실패하면 토스트를 띄우고 편집 화면에 머문다", async ({
    page,
  }) => {
    await mockSaveMoodboardFailure(page);

    const edit = new EditPage(page);
    await edit.goto(TEST_SESSION_ID);
    await expect(edit.canvas).toBeVisible();

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
