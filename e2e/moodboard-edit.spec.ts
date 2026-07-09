import { expect, test } from "@playwright/test";

import { MOODBOARD_ID } from "./fixtures/data";
import { EditPage } from "./pages/edit.page";
import { mockSaveMoodboard, mockSaveMoodboardFailure } from "./utils/mock-api";

// /moodboard/[moodboardId]/edit — 저장된 무드보드 재편집.
// 서버 컴포넌트가 데이터를 조회하지 않고 base 이미지를 상수에서 고르므로 mock 없이 진입한다.
// (생성 직후 편집 /test/[sessionId]/edit 는 Supabase 를 직접 불러 보류 상태 — edit.spec.ts)
test.describe("무드보드 재편집", () => {
  test("캔버스와 도구 바를 렌더한다", async ({ page }) => {
    const edit = new EditPage(page);
    await edit.gotoSaved(MOODBOARD_ID);

    await expect(edit.canvas).toBeVisible();
    await expect(edit.tool("이동")).toHaveAttribute("aria-pressed", "true");
    await expect(edit.completeButton).toBeEnabled();
  });

  test("도구를 고르면 활성 상태가 바뀐다", async ({ page }) => {
    const edit = new EditPage(page);
    await edit.gotoSaved(MOODBOARD_ID);

    await edit.selectTool("펜");

    await expect(edit.tool("펜")).toHaveAttribute("aria-pressed", "true");
    await expect(edit.tool("이동")).toHaveAttribute("aria-pressed", "false");
  });

  test("스티커를 추가하면 이동 도구로 돌아온다", async ({ page }) => {
    const edit = new EditPage(page);
    await edit.gotoSaved(MOODBOARD_ID);

    await edit.selectTool("스티커");
    await edit.sticker("은빛 별").click();

    // addSticker 가 setTool("move") 로 되돌린다 — 추가 직후 바로 옮길 수 있게.
    await expect(edit.tool("이동")).toHaveAttribute("aria-pressed", "true");
  });

  test("텍스트 박스를 추가하고 내용을 입력한다", async ({ page }) => {
    const edit = new EditPage(page);
    await edit.gotoSaved(MOODBOARD_ID);

    await edit.selectTool("글자");
    await edit.addTextButton.click();
    await edit.textContentInput.fill("조용한 확신");

    await expect(edit.textContentInput).toHaveValue("조용한 확신");
  });

  test("Undo 로 방금 추가한 요소를 되돌린다", async ({ page }) => {
    const edit = new EditPage(page);
    await edit.gotoSaved(MOODBOARD_ID);

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
    await edit.gotoSaved(MOODBOARD_ID);
    await expect(edit.canvas).toBeVisible();

    await edit.complete();

    await edit.waitForResult();
  });

  test("저장에 실패하면 토스트를 띄우고 편집 화면에 머문다", async ({
    page,
  }) => {
    await mockSaveMoodboardFailure(page);

    const edit = new EditPage(page);
    await edit.gotoSaved(MOODBOARD_ID);
    await expect(edit.canvas).toBeVisible();

    await edit.complete();

    await expect(edit.toast).toContainText("저장하지 못했어요.");
    await expect(edit.completeButton).toBeEnabled();
  });

  test("뒤로를 누르면 나가기 확인 다이얼로그를 띄운다", async ({ page }) => {
    const edit = new EditPage(page);
    await edit.gotoSaved(MOODBOARD_ID);

    await edit.backButton.click();

    await expect(edit.leaveDialog).toBeVisible();

    await edit.leaveCancelButton.click();

    await expect(edit.leaveDialog).toBeHidden();
    await expect(edit.canvas).toBeVisible();
  });
});
