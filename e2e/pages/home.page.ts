import type { Locator, Page } from "@playwright/test";

// FirstEntryLanding 의 CTA — 보이는 텍스트는 "Create" 이고 전체 문구는 aria-label 에 있다.
const CREATE_CTA = "무드보드 만들기 — 추구미 테스트 시작하기";

// 홈에서 시작하면 sessionId 는 서버가 새로 발급하므로 값을 미리 알 수 없다.
const TEST_URL = /\/test\/[0-9a-f-]{36}$/;

export class HomePage {
  readonly createButton: Locator;

  constructor(private readonly page: Page) {
    this.createButton = page.getByRole("button", { name: CREATE_CTA });
  }

  async goto() {
    await this.page.goto("/");
  }

  /** Create 를 눌러 추구미 테스트로 이동하고, 새로 발급된 sessionId 를 돌려준다. */
  async startMoodTest(): Promise<string> {
    await this.createButton.click();
    await this.page.waitForURL(TEST_URL);

    const sessionId = new URL(this.page.url()).pathname.split("/").at(-1);
    if (!sessionId) {
      throw new Error(`sessionId 를 읽지 못했습니다: ${this.page.url()}`);
    }
    return sessionId;
  }
}
