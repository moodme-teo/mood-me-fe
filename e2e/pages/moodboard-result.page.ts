import type { Download, Locator, Page } from "@playwright/test";

/**
 * MoodboardResultPage — 최종 결과물 페이지 (`/moodboard/[moodboardId]`)
 *
 * 숨기는 것:
 * - 결과물이 두 가지 방식으로 렌더된다는 사실. exportedImageUrl 이 있으면 크롭 결과를
 *   <img> 로 그대로 보여주고(=지금 만들어지는 모든 보드), 없으면 뷰어(BoardPreview)가
 *   elements 를 Konva <canvas> 로 합성한다(=#102 이전 보드).
 * - "SNS 공유" 가 공유 시트가 아니라 링크 클립보드 복사라는 사실
 * - "편집" 은 버튼이 아니라 링크(`a`)라는 사실 — 이동이므로 role 이 다르다
 *
 * 사용 기준:
 * - 기본은 exportedImage 를 본다. canvas 는 레거시 보드를 검증할 때만 쓴다.
 * - exportPng() 는 다운로드 이벤트를 받아 돌려준다. spec 이 파일명을 단언한다.
 */
export class MoodboardResultPage {
  /** 크롭 결과 — exportedImageUrl 이 있을 때 렌더되는 평면 이미지. */
  readonly exportedImage: Locator;
  /** 레거시 보드 — BoardPreview 가 Konva Stage 로 그리는 <canvas> (배럴 경유 ssr:false). */
  readonly canvas: Locator;
  readonly exportButton: Locator;
  readonly shareButton: Locator;
  readonly savedToast: Locator;
  readonly copiedToast: Locator;
  readonly editLink: Locator;
  readonly errorMessage: Locator;

  constructor(private readonly page: Page) {
    this.exportedImage = page.getByRole("img", { name: "크롭한 무드 이미지" });
    this.canvas = page.locator("canvas").first();
    this.exportButton = page.getByRole("button", { name: "이미지 내보내기" });
    this.shareButton = page.getByRole("button", { name: "SNS 공유" });
    this.savedToast = page.getByText("PNG 이미지를 저장했어요.");
    // "SNS 공유" 는 공유 시트가 아니라 링크를 클립보드에 복사한다.
    this.copiedToast = page.getByText("링크를 복사했어요.");
    this.editLink = page.getByRole("link", { name: "편집" });
    this.errorMessage = page.getByText("결과를 불러오지 못했어요.");
  }

  async goto(moodboardId: string) {
    await this.page.goto(`/moodboard/${moodboardId}`);
  }

  typeName(name: string): Locator {
    return this.page.getByText(name);
  }

  /** 내보내기를 누르고 다운로드 이벤트를 받아 돌려준다. */
  async exportPng(): Promise<Download> {
    const download = this.page.waitForEvent("download");
    await this.exportButton.click();
    return download;
  }
}
