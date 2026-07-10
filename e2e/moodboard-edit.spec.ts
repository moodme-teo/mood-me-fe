import { expect, test } from "@playwright/test";

import { MOODBOARD_ID } from "./fixtures/data";
import { EditPage } from "./pages/edit.page";
import {
  mockMoodboard,
  mockSaveMoodboard,
  mockSaveMoodboardFailure,
} from "./utils/mock-api";
import {
  downloadToDataUrl,
  expectColorNear,
  readImageAverages,
  readImagePixels,
  readPreviewAverages,
} from "./utils/pixels";

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
 * - PNG 는 투명을 유지하고 JPG 는 그 자리를 흰색으로 채운다 (§7 배경).
 * - 저장 결과물이 미리보기와 같다 (§11 — 이 제품의 핵심 계약).
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
 * - 픽셀 단언은 utils/pixels.ts 를 쓴다. 미리보기 캔버스와 내보낸 이미지는 해상도가
 *   다르므로(디스플레이 크기 × DPR vs 720px) 좌표는 비율로, 색은 주변 평균으로 읽는다.
 *
 * 미리보기↔결과물 비교는 반드시 **단색 배경**에서 해야 한다. 투명 배경의 체크보드는 Konva
 * Stage 가 아니라 그 뒤에 깔린 DOM div 라서 내보내기에 들어가지 않는다 — 투명 배경으로
 * 비교하면 "배경이 사라졌다" 는 거짓 실패가 난다.
 *
 * 테스트하지 않는 것:
 * - 핀치 줌·드래그 이동·더블탭 초기화 (§7) — 터치 제스처. 슬라이더·버튼 경로로 대체한다.
 * - 그라데이션·최근 사용 색상 (§3.4) — 아직 미구현
 * - 위젯용 이미지 제작 (§3.6) — MVP 제외, P2
 * - 생성 직후 편집(`/test/[sessionId]/edit`) — Supabase 직접 호출로 보류, edit.spec.ts
 */

/**
 * 원형 크롭 바깥의 모서리 — 배경만 보이는 지점.
 *
 * 표본 상자(캔버스 한 변의 10%)까지 통째로 원 바깥에 있어야 한다. 상자가 원에 걸치면
 * 사진 픽셀이 섞여 "배경이 검정" 이라는 단언이 흔들린다.
 */
const OUTSIDE_CROP = { x: 0.06, y: 0.06 };
/** 원형 크롭 한가운데 — 사진이 보이는 지점. */
const INSIDE_CROP = { x: 0.5, y: 0.5 };

const OPAQUE_WHITE = { r: 255, g: 255, b: 255, a: 255 };
/** 배경 프리셋 "검정" 은 순수 검정이 아니라 #171717 이다 (BACKGROUND_PRESETS). */
const PRESET_BLACK = { r: 23, g: 23, b: 23, a: 255 };

/** JPEG(quality 0.92) 손실 허용치. 단색 영역이라 실제 오차는 이보다 훨씬 작다. */
const JPEG_TOLERANCE = 4;
/** 미리보기(DPR 배율)와 내보내기(720px)의 리샘플링 차이 허용치. */
const RESAMPLE_TOLERANCE = 16;
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
    await expect(edit.toast).toContainText("PNG 이미지로 저장했어요.");
    await expect(edit.saveSheet).toBeHidden();
  });

  // 시트가 "PNG로 저장 (투명 유지)" / "JPG로 저장 (흰 배경)" 이라고 약속한 그대로인지 본다.
  // 기본 상태(원형 크롭 + 투명 배경)라 원 바깥 모서리가 곧 투명 영역이다.
  test("PNG 는 투명을 유지하고 JPG 는 흰 배경으로 바꾼다", async ({ page }) => {
    const edit = new EditPage(page);
    await edit.gotoSaved(MOODBOARD_ID);
    await expect(edit.canvas).toBeVisible();

    await edit.openSaveSheet();
    const png = await downloadToDataUrl(await edit.downloadPng());
    const [pngCorner] = await readImagePixels(page, png, [OUTSIDE_CROP]);
    expect(pngCorner.a).toBe(0);

    // 다운로드하면 시트가 닫힌다 — JPG 를 받으려면 다시 연다.
    await edit.openSaveSheet();
    const jpg = await downloadToDataUrl(await edit.downloadJpg());
    const [jpgCorner] = await readImagePixels(page, jpg, [OUTSIDE_CROP]);

    // compositeOnWhite 가 투명을 흰색으로 덮는다. JPEG 에는 alpha 채널이 없다.
    expectColorNear(jpgCorner, OPAQUE_WHITE, JPEG_TOLERANCE);
  });

  // mood-edit.md §11 — "미리보기와 저장 결과물이 달라지면 신뢰가 깨진다".
  // 배경(레이어 1)과 크롭된 사진(레이어 2)을 각각 짚어, 두 레이어 모두 결과물에
  // 같은 자리·같은 색으로 실린다는 것을 확인한다.
  test("저장 결과물이 미리보기와 같다", async ({ page }) => {
    const edit = new EditPage(page);
    await edit.gotoSaved(MOODBOARD_ID);
    await expect(edit.canvas).toBeVisible();

    // 이미지가 로드돼야 사진이 그려진다 — 빈 캔버스끼리 비교하면 무의미하다.
    await edit.openImageTabWhenReady();
    await expect(edit.resetButton).toBeEnabled();

    // 체크보드는 DOM 이라 내보내기에 없다. 단색 배경이라야 배경까지 비교할 수 있다.
    await edit.openTab("배경");
    await edit.blackBackgroundButton.click();
    // aria-pressed 는 React 상태를, 캔버스는 Konva 의 다음 프레임을 따라간다.
    // 상태만 보고 픽셀을 읽으면 아직 투명한 이전 프레임을 읽는다.
    await expect(edit.blackBackgroundButton).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await edit.waitForPreviewPaint();

    const points = [OUTSIDE_CROP, INSIDE_CROP];
    const preview = await readPreviewAverages(page, points);

    // 배경이 실제로 그려졌는지 먼저 못박는다. 그래야 아래 비교가 "둘 다 비었다" 로
    // 통과하는 일이 없다.
    expectColorNear(preview[0], PRESET_BLACK, RESAMPLE_TOLERANCE);

    await edit.openSaveSheet();
    const png = await downloadToDataUrl(await edit.downloadPng());
    const exported = await readImageAverages(page, png, points);

    expectColorNear(exported[0], preview[0], RESAMPLE_TOLERANCE);
    expectColorNear(exported[1], preview[1], RESAMPLE_TOLERANCE);
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
