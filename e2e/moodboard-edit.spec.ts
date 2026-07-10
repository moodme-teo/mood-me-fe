import { expect, test } from "@playwright/test";

import { MOODBOARD_ID } from "./fixtures/data";
import { EditPage } from "./pages/edit.page";
import {
  mockMoodboard,
  mockSaveMoodboard,
  mockSaveMoodboardFailure,
} from "./utils/mock-api";

/**
 * 테스트 대상: 저장된 무드보드 재편집 (`/moodboard/[moodboardId]/edit`)
 * 스펙 원본: docs/prd/mood-edit.md (이미지 크롭 에디터 PRD)
 *
 * ⚠️ 이 화면은 #102 에서 성격이 바뀌었다. 스티커·글자·펜·지우개를 얹는 캔버스 편집기
 * (PRD §5.5)에서 **비주얼 크롭 에디터**로 교체됐다. mood-me-prd.md §5.5 는 아직
 * 옛 도구를 명세하고 있으니, 이 화면의 기준 문서는 mood-edit.md 다.
 *
 * 핵심 가치는 "복잡한 디자인 툴 없이 예쁜 크롭 이미지를 빠르게" 다. 그래서 핵심 플로우가
 * 5단계 이내로 끝나야 한다 (mood-edit.md §6).
 *
 *   [도형 고르기] → [구도 맞추기] → [배경 고르기] → [저장]
 *      §3.2 P0        §7 이미지편집     §3.3/§3.4 P0     §4.3
 *
 * 화면 구성 (§4.2):
 *   상단 — 뒤로 · "편집" · 저장
 *   중앙 — 현재 도형으로 크롭된 미리보기 (배경색 또는 투명 체크보드)
 *   하단 — 모드 탭 4개: 이미지 · 도형 · 배경 · 색상
 *
 * 기본 상태는 **도형 탭 + 원형 크롭 + 투명 배경** 이다 (useCropEditor 의 DEFAULT_STATE).
 * 도형은 가로 스크롤 리스트로 제공되고 선택 즉시 미리보기에 반영된다 (§3.2).
 * 배경은 투명 / 이미지 블러 / 흰색 / 검정 / 직접 선택, 그리고 색상 탭의 **추천 팔레트**다.
 * 추천 팔레트는 이미지를 canvas pixel sampling 해 dominant color 5~8개를 뽑는다 (§3.5).
 *
 * 저장은 시트로 분리돼 있다 (§4.3). PNG 는 투명값을 유지하고 JPG 는 투명 배경을 흰색으로
 * 변환한다 (§7 배경). "완성하고 공유하기" 는 export 이미지를 PATCH 로 커밋하고 결과물로 간다.
 *
 * 시나리오:
 * - 도형을 바꾸면 활성 도형이 바뀐다. 탭을 바꾸면 해당 패널만 열린다.
 * - 배경을 흰색으로 바꾸면 투명이 해제된다.
 * - 확대한 뒤 "구도 초기화" 로 되돌린다 (§7 — 더블탭 초기화와 같은 동작).
 * - 색상 탭이 이미지에서 뽑은 추천 배경색을 노출하고, 고르면 배경에 반영된다.
 * - 저장 시트에서 PNG 를 내려받거나, 완성해 결과물 페이지로 넘어간다.
 * - 저장에 실패하면 토스트를 띄우고 편집 화면에 머문다.
 * - 뒤로 누르면 나가기 확인 다이얼로그를 띄운다 (미저장 크롭은 폐기).
 *
 * 테스트 성격: smoke (+ 저장 실패는 edge case)
 *
 * 전제 조건:
 * - 서버 컴포넌트가 데이터를 조회하지 않고 moodboardId 해시로 base 이미지를 고른다.
 *   그래서 진입에는 mock 이 필요 없다. 저장(PATCH)만 mock 한다.
 * - 추천 팔레트 추출에는 tainted 되지 않은 캔버스가 필요하다. base 이미지가 같은 출처의
 *   `public/test-image/…` 라서 getImageData 가 통과한다.
 *
 * 테스트하지 않는 것:
 * - **저장 결과물이 미리보기와 같은지** — mood-edit.md §11 이 "미리보기와 저장 결과물이
 *   달라지면 신뢰가 깨진다" 고 못박은 이 제품의 핵심 계약이지만, Konva 렌더 픽셀 비교라
 *   visual regression 없이는 검증할 수 없다. 지금은 다운로드가 일어나는 것까지만 본다.
 * - 핀치 줌·드래그 이동·더블탭 초기화 (§7) — 터치 제스처. 슬라이더·버튼 경로로 대체한다.
 * - JPG 저장 시 투명 → 흰색 변환 (§7 배경) — 위와 같은 픽셀 검증 문제
 * - 그라데이션·최근 사용 색상 (§3.4) — 아직 미구현
 * - 위젯용 이미지 제작 (§3.6) — MVP 제외, P2
 * - 생성 직후 편집(`/test/[sessionId]/edit`) — Supabase 직접 호출로 보류, edit.spec.ts
 */
test.describe("무드보드 재편집", () => {
  test("캔버스와 크롭 도구를 렌더한다", async ({ page }) => {
    const edit = new EditPage(page);
    await edit.gotoSaved(MOODBOARD_ID);

    await expect(edit.canvas).toBeVisible();
    // 진입 기본값은 도형 탭 + 원형 크롭 (useCropEditor 의 DEFAULT_STATE).
    await expect(edit.tab("도형")).toHaveAttribute("aria-pressed", "true");
    await expect(edit.shape("원")).toHaveAttribute("aria-pressed", "true");
    await expect(edit.saveButton).toBeEnabled();
  });

  test("도형을 고르면 활성 도형이 바뀐다", async ({ page }) => {
    const edit = new EditPage(page);
    await edit.gotoSaved(MOODBOARD_ID);

    await edit.selectShape("하트");

    await expect(edit.shape("하트")).toHaveAttribute("aria-pressed", "true");
    await expect(edit.shape("원")).toHaveAttribute("aria-pressed", "false");
  });

  test("탭을 바꾸면 해당 패널이 열린다", async ({ page }) => {
    const edit = new EditPage(page);
    await edit.gotoSaved(MOODBOARD_ID);

    await edit.openTab("배경");

    await expect(edit.tab("배경")).toHaveAttribute("aria-pressed", "true");
    await expect(edit.transparentBackgroundButton).toBeVisible();
    // 패널은 한 번에 하나만 — 도형 목록은 사라진다.
    await expect(edit.shape("원")).toBeHidden();
  });

  test("배경을 흰색으로 바꾸면 투명이 해제된다", async ({ page }) => {
    const edit = new EditPage(page);
    await edit.gotoSaved(MOODBOARD_ID);
    await edit.openTab("배경");

    // 기본 배경은 투명 (DEFAULT_STATE.background).
    await expect(edit.transparentBackgroundButton).toHaveAttribute(
      "aria-pressed",
      "true",
    );

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
    await edit.gotoSaved(MOODBOARD_ID);
    await expect(edit.canvas).toBeVisible();

    await edit.openImageTabWhenReady();
    // 이미지가 로드돼야 metrics 가 잡히고 컨트롤이 켜진다.
    await expect(edit.resetButton).toBeEnabled();
    await expect(edit.zoomSlider).toHaveValue("1");

    await edit.setZoom(2);
    await expect(edit.zoomSlider).toHaveValue("2");

    await edit.resetButton.click();

    // getCenteredTransform 이 zoom 을 MIN_ZOOM(=1) 으로 되돌린다.
    await expect(edit.zoomSlider).toHaveValue("1");
  });

  test("색상 탭은 이미지에서 뽑은 추천 배경색을 노출한다", async ({ page }) => {
    const edit = new EditPage(page);
    await edit.gotoSaved(MOODBOARD_ID);
    await expect(edit.canvas).toBeVisible();

    await edit.openTab("색상");

    // extractPalette 는 로드된 이미지를 픽셀 샘플링한다 — 최소 한 개는 나와야 한다.
    await expect(edit.paletteSwatches.first()).toBeVisible();
    await expect(edit.paletteEmptyMessage).toBeHidden();

    await edit.paletteSwatches.first().click();

    await expect(edit.paletteSwatches.first()).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  test("저장을 누르면 저장 시트를 연다", async ({ page }) => {
    const edit = new EditPage(page);
    await edit.gotoSaved(MOODBOARD_ID);
    await expect(edit.canvas).toBeVisible();

    await edit.openSaveSheet();

    await expect(edit.saveSheet).toBeVisible();
    await expect(edit.downloadPngButton).toBeVisible();
    await expect(edit.downloadJpgButton).toBeVisible();
    await expect(edit.completeButton).toBeEnabled();

    await edit.saveSheetCloseButton.click();

    await expect(edit.saveSheet).toBeHidden();
  });

  test("PNG 로 저장하면 파일을 내려받고 시트를 닫는다", async ({ page }) => {
    const edit = new EditPage(page);
    await edit.gotoSaved(MOODBOARD_ID);
    await expect(edit.canvas).toBeVisible();

    await edit.openSaveSheet();
    const download = await edit.downloadPng();

    expect(download.suggestedFilename()).toBe(`mood-me-${MOODBOARD_ID}.png`);
    await expect(edit.toast).toContainText("PNG 이미지를 저장했어요.");
    await expect(edit.saveSheet).toBeHidden();
  });

  test("완성하고 공유하기를 누르면 저장 후 결과물 페이지로 간다", async ({
    page,
  }) => {
    // page.route 는 나중에 등록한 핸들러가 먼저 잡는다. PATCH 는 저장 mock 이 처리하고,
    // 이동한 결과물 페이지의 GET 은 fallback 으로 흘러 이 mock 이 받는다.
    await mockMoodboard(page);
    await mockSaveMoodboard(page);

    const edit = new EditPage(page);
    await edit.gotoSaved(MOODBOARD_ID);
    await expect(edit.canvas).toBeVisible();

    await edit.openSaveSheet();
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

    await edit.openSaveSheet();
    await edit.complete();

    await expect(edit.toast).toContainText("저장하지 못했어요.");
    // 시트는 열린 채로 남아 곧바로 다시 시도할 수 있다.
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

  test("나가기를 확인하면 홈으로 돌아간다", async ({ page }) => {
    const edit = new EditPage(page);
    await edit.gotoSaved(MOODBOARD_ID);

    await edit.backButton.click();
    await edit.leaveConfirmButton.click();

    await page.waitForURL("/");
  });
});
