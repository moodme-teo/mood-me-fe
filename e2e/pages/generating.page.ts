import type { Locator, Page } from "@playwright/test";

const ERROR_HEADING = "앗, 생성이 잠깐 멈췄어요";

export class GeneratingPage {
  readonly progressBar: Locator;
  readonly errorHeading: Locator;
  readonly retryButton: Locator;

  constructor(private readonly page: Page) {
    this.progressBar = page.getByRole("progressbar");
    this.errorHeading = page.getByText(ERROR_HEADING);
    this.retryButton = page.getByRole("button", { name: "다시 시도" });
  }

  async goto(sessionId: string) {
    await this.page.goto(`/test/${sessionId}/generating`);
  }

  /**
   * 진행률은 서버 job 의 progressPercent 가 아니라 클라이언트가 시간 기준으로 채우는 연출이다
   * (useGenerationPolling.ts — 10% 에서 시작해 92% 를 상한으로 채우고, completed 신호에서 100%).
   * 그래서 mock 응답의 percent 값을 단언하지 말고 "증가한다"만 검증해야 한다.
   */
  async readPercent(): Promise<number> {
    const value = await this.progressBar.getAttribute("aria-valuenow");
    return Number(value);
  }

  async retry() {
    await this.retryButton.click();
  }

  /**
   * 편집 화면(/test/[sessionId]/edit)은 서버 컴포넌트가 Supabase service client 를 직접 호출해서
   * page.route 로 mock 되지 않는다. 이동이 일어나는지까지만 검증하고 렌더 검증은 후속 과제로 둔다.
   */
  async waitForEdit(sessionId: string) {
    await this.page.waitForURL(`**/test/${sessionId}/edit`);
  }
}
