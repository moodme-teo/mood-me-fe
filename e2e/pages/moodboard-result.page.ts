import type { Download, Locator, Page } from "@playwright/test";

export class MoodboardResultPage {
  /** BoardPreview 는 Konva Stage 로 <canvas> 를 그린다 (배럴 경유 ssr:false). */
  readonly canvas: Locator;
  readonly exportButton: Locator;
  readonly shareButton: Locator;
  readonly savedToast: Locator;
  readonly copiedToast: Locator;
  readonly editLink: Locator;
  readonly errorMessage: Locator;

  constructor(private readonly page: Page) {
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
