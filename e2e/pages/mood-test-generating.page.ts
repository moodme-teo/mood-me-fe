import type { Locator, Page } from "@playwright/test";

const ERROR_HEADING = "무드보드를 완성하지 못했어요.";

/**
 * GeneratingPage — 무드보드 생성중 (`/test/[sessionId]/generating`)
 *
 * 숨기는 것:
 * - 진행률이 서버 job 값이 아니라 클라이언트 연출이라는 사실 (readPercent 참조)
 * - 편집 화면 렌더는 검증할 수 없고 이동까지만 본다는 사실 (waitForEdit 참조)
 *
 * 사용 기준:
 * - readPercent() 는 절대값 단언이 아니라 expect.poll 로 "증가한다" 를 볼 때 쓴다.
 */
export class GeneratingPage {
  readonly progressBar: Locator;
  readonly errorHeading: Locator;
  readonly retryButton: Locator;
  readonly homeButton: Locator;
  /** 재진입(새로고침·뒤로가기)으로 기존 job을 이어 폴링할 때만 뜨는 고정 문구(#115·#122). */
  readonly reentryMessage: Locator;
  /** 생성 중 뒤로가기·앞으로가기를 가로챘을 때 뜨는 주의 다이얼로그(useConfirmLeave). */
  readonly leaveDialog: Locator;
  readonly leaveConfirmButton: Locator;
  readonly leaveCancelButton: Locator;

  constructor(private readonly page: Page) {
    this.progressBar = page.getByRole("progressbar");
    this.errorHeading = page.getByText(ERROR_HEADING);
    this.reentryMessage = page.getByText(
      "만들던 무드보드를 다시 불러오고 있어요.",
    );
    // 재시도 중에는 라벨이 "다시 만드는 중"으로 바뀐다(disabled) — 두 상태 모두 매칭해야
    // 잠금 상태에서도 같은 locator로 버튼을 찾을 수 있다.
    this.retryButton = page.getByRole("button", {
      name: /다시 만들어보기|다시 만드는 중/,
    });
    this.homeButton = page.getByRole("button", { name: "홈으로" });
    this.leaveDialog = page.getByRole("dialog", {
      name: "무드보드를 만드는 중이에요",
    });
    this.leaveConfirmButton = page.getByRole("button", { name: "나가기" });
    this.leaveCancelButton = page.getByRole("button", {
      name: "계속 기다리기",
    });
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
