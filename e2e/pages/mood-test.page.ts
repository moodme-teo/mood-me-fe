import { expect, type Locator, type Page } from "@playwright/test";

// 추구미 테스트는 8개 화면(담기 12 → 덜어내기 4 → 3 → 그림자 3 → 전환×3 → 최종 5)이다.
// components/test/mood-test-flow.ts 의 TOTAL_SCREENS 와 맞춘다.
const TOTAL_SCREENS = 8;

const SELECTION_PATTERN = /(\d+)\s*\/\s*(\d+)\s*선택됨/;

/**
 * MoodTestPage — 추구미 테스트 (`/test/[sessionId]`)
 *
 * 숨기는 것:
 * - 8개 화면의 선택지 UI 가 세 종류(이미지·키워드·혼합)로 다르다는 사실. 화면 종류를
 *   몰라도 넘길 수 있게 aria-pressed 와 "N / M 선택됨" 상태 텍스트만으로 조작한다.
 *   (data-testid 를 새로 뿌리지 않기 위한 선택 — 네 개 선택 컴포넌트가 모두 이 둘을 노출한다.)
 * - 마지막 화면에서 "다음" 이 "무드보드 생성하기" 로 바뀐다는 사실
 *
 * 사용 기준:
 * - complete() 는 완주가 목적일 때만 쓴다. 선택 규칙 자체를 검증한다면 pickOne() 으로
 *   한 번에 한 칸씩 눌러 spec 이 중간 상태를 단언할 수 있게 한다.
 * - 목표치를 채우면 고르지 않은 선택지가 `disabled` 된다. unpickedOptions 가 그때
 *   비는 것은 버그가 아니라 정원 초과 방지다 — 바꾸려면 pickedOptions 를 먼저 해제한다.
 */
export class MoodTestPage {
  readonly nextButton: Locator;
  readonly backButton: Locator;
  readonly selectionStatus: Locator;
  /** 아직 고르지 않았고 아직 누를 수 있는 선택지. 정원이 차면 0개가 된다. */
  readonly unpickedOptions: Locator;
  /** 이미 고른 선택지. 다시 누르면 해제된다. */
  readonly pickedOptions: Locator;

  /**
   * 헤더 우측의 "완성되어 가는" 미니 보드. 지금까지 살아남은 카드가 나열된다.
   *
   * 카드 이미지는 장식이라 `alt=""` 다 — 접근성 트리에 이름이 없다. 그래서 개수는
   * role 이 아니라 컨테이너 안의 `img` 로 센다.
   */
  readonly previewBoard: Locator;
  readonly previewCards: Locator;

  /** 상위 단계를 바꿔 하위 단계가 지워질 때 뜨는 확인 다이얼로그. */
  readonly resetDialog: Locator;
  readonly resetConfirmButton: Locator;
  readonly resetCancelButton: Locator;

  constructor(private readonly page: Page) {
    this.nextButton = page.getByRole("button", {
      name: /^(다음|무드보드 생성하기)/,
    });
    this.backButton = page.getByRole("button", { name: "이전 질문으로" });
    this.selectionStatus = page.locator('p[role="status"]');
    this.unpickedOptions = page.locator(
      'button[aria-pressed="false"]:not([disabled])',
    );
    this.pickedOptions = page.locator('button[aria-pressed="true"]');

    this.previewBoard = page.getByLabel("완성되어 가는 추구미 무드보드");
    this.previewCards = this.previewBoard.locator("img");

    this.resetDialog = page.getByRole("dialog", {
      name: "이전 선택을 바꾸면 이후에 고른 내용이 초기화돼요",
    });
    this.resetConfirmButton = page.getByRole("button", { name: "변경할게요" });
    this.resetCancelButton = page.getByRole("button", {
      name: "그대로 둘게요",
    });
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

  /** 이미 고른 선택지 하나를 해제하고, 상태 텍스트에 반영될 때까지 기다린다. */
  async unpickOne() {
    const { picked, target } = await this.readSelection();
    await this.pickedOptions.first().click();
    await expect(this.selectionStatus).toContainText(
      `${picked - 1} / ${target} 선택됨`,
    );
  }

  /**
   * 목록 끝쪽의 선택지를 고른다.
   *
   * pickOne() 은 항상 첫 번째 미선택 항목을 누른다. 방금 unpickOne() 으로 해제한 카드가
   * 바로 그 자리로 돌아오므로, 이어서 pickOne() 을 부르면 같은 카드를 다시 골라 선택
   * 집합이 그대로다. "선택을 바꿨다" 를 만들려면 다른 카드를 눌러야 한다.
   */
  async pickAnother() {
    const { picked, target } = await this.readSelection();
    await this.unpickedOptions.last().click();
    await expect(this.selectionStatus).toContainText(
      `${picked + 1} / ${target} 선택됨`,
    );
  }

  /**
   * 대기 없이 선택지를 연달아 누른다 — 리듀서의 정원 초과 방어(toggleDraftId)를 직접 친다.
   *
   * Playwright 의 click() 은 매번 actionability 를 확인하느라 리렌더를 기다린다. 그러면
   * 정원이 찬 순간 나머지 카드가 disabled 되어 클릭이 멈추고, 검증하려던 경합 자체가
   * 일어나지 않는다. 그래서 한 태스크 안에서 DOM 클릭을 직접 쏴 리렌더 전의 상태를 노린다.
   */
  async burstPick(count: number) {
    await this.page.evaluate((total) => {
      const options = Array.from(
        document.querySelectorAll<HTMLButtonElement>("button[aria-pressed]"),
      );
      for (const option of options.slice(0, total)) option.click();
    }, count);
  }

  /** 이전 화면으로 돌아간다. 첫 화면에서 누르면 홈으로 나간다. */
  async back() {
    await this.backButton.click();
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
