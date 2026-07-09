import { expect, type Locator, type Page } from "@playwright/test";

// 추구미 테스트는 8개 화면(담기 12 → 덜어내기 4 → 3 → 그림자 3 → 전환×3 → 최종 5)이다.
// mood-test-flow.ts 의 TOTAL_SCREENS 와 맞춘다.
const TOTAL_SCREENS = 8;

const SELECTION_PATTERN = /(\d+)\s*\/\s*(\d+)\s*선택됨/;

/**
 * 화면 종류를 몰라도 넘길 수 있게, 선택지 버튼의 aria-pressed 와
 * TestLayout 의 "N / M 선택됨" 상태 텍스트만으로 조작한다.
 * (data-testid 를 새로 뿌리지 않기 위한 선택 — 네 개 선택 컴포넌트가 모두 이 둘을 노출한다.)
 */
export class MoodTestPage {
  readonly nextButton: Locator;
  readonly selectionStatus: Locator;
  private readonly unpickedOptions: Locator;

  constructor(private readonly page: Page) {
    this.nextButton = page.getByRole("button", {
      name: /^(다음|무드보드 생성하기)/,
    });
    this.selectionStatus = page.locator('p[role="status"]');
    this.unpickedOptions = page.locator(
      'button[aria-pressed="false"]:not([disabled])',
    );
  }

  async goto(sessionId: string) {
    await this.page.goto(`/test/${sessionId}`);
  }

  /** 현재 화면의 "N / M 선택됨" 을 읽는다. */
  async readSelection(): Promise<{ picked: number; target: number }> {
    const text = await this.selectionStatus.innerText();
    const matched = text.match(SELECTION_PATTERN);
    if (!matched) {
      throw new Error(
        `선택 상태 텍스트를 읽지 못했습니다: ${JSON.stringify(text)}`,
      );
    }
    return { picked: Number(matched[1]), target: Number(matched[2]) };
  }

  /** 아직 고르지 않은 선택지 하나를 누르고, 상태 텍스트에 반영될 때까지 기다린다. */
  async pickOne() {
    const { picked, target } = await this.readSelection();
    await this.unpickedOptions.first().click();
    // 즉시 다시 읽으면 stale 값으로 과선택할 수 있어 반영을 기다린다.
    await expect(this.selectionStatus).toContainText(
      `${picked + 1} / ${target} 선택됨`,
    );
  }

  /** 현재 화면의 목표치를 채운다. */
  async fillCurrentScreen() {
    for (;;) {
      const { picked, target } = await this.readSelection();
      if (picked >= target) return;
      await this.pickOne();
    }
  }

  /** 첫 화면부터 끝까지 완주한다. 마지막 "무드보드 생성하기" 를 누르면 생성중 화면으로 간다. */
  async complete() {
    for (let screen = 0; screen < TOTAL_SCREENS; screen += 1) {
      await this.fillCurrentScreen();
      await this.nextButton.click();
    }
  }

  async waitForGenerating(sessionId: string) {
    await this.page.waitForURL(`**/test/${sessionId}/generating`);
  }
}
