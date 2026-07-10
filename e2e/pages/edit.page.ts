import type { Download, Locator, Page } from "@playwright/test";

// MoodboardCropEditor 의 하단 탭 — TABS 의 aria-label 과 1:1.
export type CropTab = "이미지" | "도형" | "배경" | "색상";

// ShapePanel 의 도형 버튼 aria-label — crop-shapes.ts 의 CROP_SHAPES.label.
// SVG 도형(crop-svg-shapes.ts)도 같은 방식으로 노출되므로 필요하면 여기에 덧붙인다.
export type CropShapeLabel =
  | "크롭 안 함"
  | "원"
  | "타원"
  | "정사각형"
  | "둥근 사각형"
  | "세로 캡슐"
  | "가로 캡슐"
  | "별"
  | "하트"
  | "다이아몬드";

// 저장 후 이동하는 곳. 생성 직후 편집(/test/[sessionId]/edit)에서는 moodboardId 를
// 서버가 진입할 때마다 randomUUID 로 새로 발급하므로 값을 미리 알 수 없다
// (PRD §5.7 — 완성 전까지 서버에 쓰지 않는다).
const MOODBOARD_URL = /\/moodboard\/[0-9a-f-]{36}$/;

// ColorPanel 의 추천 배경색 버튼 — aria-label 이 `{hex} 배경` 이다.
const PALETTE_SWATCH = 'button[aria-label$=" 배경"]';

/**
 * EditPage — 크롭 편집 화면
 * (`/moodboard/[moodboardId]/edit` · `/test/[sessionId]/edit` — 둘 다 MoodboardCropEditor)
 *
 * 숨기는 것:
 * - 하단 탭·배경 패널·도형 목록의 접근성 이름이 서로 부분 일치해 스코프와 정확 일치가
 *   필요하다는 사실 (탭 "이미지" vs 배경 "이미지 블러", 도형 "원" vs "타원")
 * - 헤더의 "저장" 이 곧바로 저장하지 않고 저장 시트를 먼저 연다는 흐름
 * - 이미지 로드 전에는 확대·구도 초기화가 disabled 라는 사실
 *
 * 사용 기준:
 * - 두 라우트의 진입만 goto / gotoSaved 로 나뉘고, 이후 조작은 완전히 같다.
 * - 단순 단언은 spec 에서 처리한다 — 여기서는 locator 만 내어 준다.
 */
export class EditPage {
  /** CropCanvas 는 Konva Stage 로 <canvas> 를 그린다 (배럴 경유 ssr:false). */
  readonly canvas: Locator;
  readonly backButton: Locator;
  /** 헤더의 저장 — 곧바로 저장하지 않고 저장 시트를 연다. */
  readonly saveButton: Locator;
  readonly toast: Locator;

  /** 저장 시트 (헤더 저장 → 열림) */
  readonly saveSheet: Locator;
  readonly downloadPngButton: Locator;
  readonly downloadJpgButton: Locator;
  readonly completeButton: Locator;
  readonly saveSheetCloseButton: Locator;

  /** 뒤로 → 확인 다이얼로그 (window.confirm 이 아니라 인앱 dialog 라 자동화로 다룰 수 있다) */
  readonly leaveDialog: Locator;
  readonly leaveConfirmButton: Locator;
  readonly leaveCancelButton: Locator;

  /** 이미지 탭 — 이미지 로드 전에는 확대·초기화가 모두 disabled 다. */
  readonly zoomSlider: Locator;
  readonly resetButton: Locator;

  /** 배경 탭 */
  readonly transparentBackgroundButton: Locator;
  readonly blurBackgroundButton: Locator;
  readonly whiteBackgroundButton: Locator;
  readonly blackBackgroundButton: Locator;
  readonly customBackgroundInput: Locator;

  /** 색상 탭 — 이미지에서 뽑은 추천 팔레트. 추출에 실패하면 안내 문구만 뜬다. */
  readonly paletteSwatches: Locator;
  readonly paletteEmptyMessage: Locator;

  /** base 이미지 로드 실패 화면 */
  readonly baseImageError: Locator;
  readonly baseImageRetryButton: Locator;

  constructor(private readonly page: Page) {
    this.canvas = page.locator("canvas").first();
    this.backButton = page.getByRole("button", { name: "뒤로" });
    // 저장 시트의 "PNG로 저장 …" 과 부분 일치하지 않도록 정확히 일치시킨다.
    this.saveButton = page.getByRole("button", { name: "저장", exact: true });
    this.toast = page.locator('div[role="status"]');

    this.saveSheet = page.getByRole("dialog", { name: "저장하기" });
    this.downloadPngButton = page.getByRole("button", {
      name: "PNG로 저장 (투명 유지)",
    });
    this.downloadJpgButton = page.getByRole("button", {
      name: "JPG로 저장 (흰 배경)",
    });
    this.completeButton = page.getByRole("button", {
      name: /^(완성하고 공유하기|저장 중)$/,
    });
    this.saveSheetCloseButton = page.getByRole("button", { name: "닫기" });

    this.leaveDialog = page.getByRole("dialog", {
      name: "편집을 그만두시겠어요?",
    });
    this.leaveConfirmButton = page.getByRole("button", { name: "나가기" });
    this.leaveCancelButton = page.getByRole("button", { name: "계속 편집" });

    this.zoomSlider = page.getByRole("slider", { name: "확대" });
    this.resetButton = page.getByRole("button", { name: "구도 초기화" });

    this.transparentBackgroundButton = page.getByRole("button", {
      name: "투명",
      exact: true,
    });
    this.blurBackgroundButton = page.getByRole("button", {
      name: "이미지 블러",
    });
    this.whiteBackgroundButton = page.getByRole("button", {
      name: "흰색",
      exact: true,
    });
    this.blackBackgroundButton = page.getByRole("button", {
      name: "검정",
      exact: true,
    });
    this.customBackgroundInput = page.getByLabel("배경색 직접 선택");

    this.paletteSwatches = page.locator(PALETTE_SWATCH);
    this.paletteEmptyMessage = page.getByText(
      "이미지에서 추천 색을 추출하지 못했어요.",
    );

    this.baseImageError = page.getByText("이미지를 불러오지 못했어요.");
    this.baseImageRetryButton = page.getByRole("button", { name: "다시 시도" });
  }

  /** 생성 직후 편집 — 서버가 job 을 조회한다 (E2E 보류, edit.spec.ts 주석 참조). */
  async goto(sessionId: string) {
    await this.page.goto(`/test/${sessionId}/edit`);
  }

  /**
   * 저장된 무드보드 재편집 — 서버 컴포넌트가 getMoodboardById()로 조회하지만, 그 함수는
   * Supabase 시크릿이 없으면(E2E/CI) mock으로 자동 폴백해 page.route 없이도 렌더된다.
   */
  async gotoSaved(moodboardId: string) {
    await this.page.goto(`/moodboard/${moodboardId}/edit`);
  }

  /** 하단 탭 버튼. 패널 버튼("이미지 블러" 등)과 겹치지 않도록 nav 안에서만 찾는다. */
  tab(label: CropTab): Locator {
    return this.page
      .getByRole("navigation", { name: "크롭 편집 모드" })
      .getByRole("button", { name: label, exact: true });
  }

  async openTab(label: CropTab) {
    await this.tab(label).click();
  }

  /** 도형 버튼 — "원" 과 "타원" 처럼 부분 일치가 겹치므로 항상 정확히 일치시킨다. */
  shape(label: CropShapeLabel): Locator {
    return this.page.getByRole("button", { name: label, exact: true });
  }

  async selectShape(label: CropShapeLabel) {
    await this.shape(label).click();
  }

  /** 이미지 로드가 끝나야 확대·초기화가 활성화된다 — 확대 조작 전 이 상태를 기다린다. */
  async openImageTabWhenReady() {
    await this.openTab("이미지");
    await this.resetButton.waitFor({ state: "visible" });
  }

  async setZoom(zoom: number) {
    await this.zoomSlider.fill(String(zoom));
  }

  async openSaveSheet() {
    await this.saveButton.click();
  }

  /**
   * Konva 가 다음 프레임을 그릴 때까지 기다린다.
   *
   * aria-pressed 는 React 상태가 바뀌는 즉시 반영되지만 캔버스 픽셀은 rAF 뒤에 바뀐다.
   * 상태만 보고 픽셀을 읽으면 직전 프레임을 읽게 된다 — 픽셀 단언 전에만 쓴다.
   */
  async waitForPreviewPaint() {
    await this.page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    );
  }

  /** 저장 시트가 열려 있어야 한다. PATCH /api/moodboards/{id} 로 저장 후 결과물로 이동한다. */
  async complete() {
    await this.completeButton.click();
  }

  /** 시트에서 PNG 를 눌러 다운로드 이벤트를 받아 돌려준다. */
  async downloadPng(): Promise<Download> {
    const download = this.page.waitForEvent("download");
    await this.downloadPngButton.click();
    return download;
  }

  /** JPG 는 투명 배경을 흰색으로 합성한 뒤 내려받는다 (mood-edit.md §7). */
  async downloadJpg(): Promise<Download> {
    const download = this.page.waitForEvent("download");
    await this.downloadJpgButton.click();
    return download;
  }

  async waitForResult() {
    await this.page.waitForURL(MOODBOARD_URL);
  }

  /** job 이 completed 가 아니면 서버가 생성중 화면으로 redirect 한다. */
  async waitForGeneratingRedirect(sessionId: string) {
    await this.page.waitForURL(`**/test/${sessionId}/generating`);
  }
}
