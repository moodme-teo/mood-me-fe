import type { Locator, Page } from "@playwright/test";

// FirstEntryLanding 의 CTA — 보이는 텍스트는 "Create" 이고 전체 문구는 aria-label 에 있다.
const CREATE_CTA = "무드보드 만들기 — 추구미 테스트 시작하기";

// 홈에서 시작하면 sessionId 는 서버가 새로 발급하므로 값을 미리 알 수 없다.
const TEST_URL = /\/test\/[0-9a-f-]{36}$/;

/**
 * HomePage — 홈 (`/`) — 메인(첫진입)과 History 두 상태를 모두 담당한다.
 *
 * 숨기는 것:
 * - 같은 경로가 저장 보드 유무에 따라 다른 화면을 렌더한다는 사실
 *   (0개면 FirstEntryLanding, 1개 이상·로딩·에러면 History)
 * - CTA 의 보이는 텍스트는 "Create" 지만 접근성 이름은 전체 문구라는 사실
 * - 테스트 진입 URL 의 sessionId 가 서버 발급이라 미리 알 수 없다는 사실
 *
 * 사용 기준:
 * - startMoodTest() 는 이동까지 마친 뒤 새 sessionId 를 돌려준다 — 이어지는
 *   화면을 조작하려면 이 값이 필요하다.
 * - History 를 보려면 seedGuestSession + mockMoodboards 가 함께 필요하다
 *   (utils/session.ts 의 seedGuestSession 주석 참조).
 */
export class HomePage {
  readonly createButton: Locator;

  /**
   * 진행 중인 작업이 있을 때만 뜨는 이어하기 링크. 메인·History 양쪽에 모두 나온다.
   * 라벨은 추구미 테스트 드래프트면 "N단계", 편집 드래프트면 "편집 중" 이고,
   * 둘 다 있으면 updatedAt 이 최신인 쪽 하나만 뜬다.
   */
  readonly continueLink: Locator;

  /** History 상태 */
  readonly historyHeading: Locator;
  readonly moodboardCount: Locator;
  readonly savedBoards: Locator;
  readonly retryPanel: Locator;
  readonly retryButton: Locator;

  constructor(private readonly page: Page) {
    this.createButton = page.getByRole("button", { name: CREATE_CTA });
    this.continueLink = page.getByRole("link", { name: /^이어서 만들기/ });

    this.historyHeading = page.getByRole("heading", { name: "History" });
    this.moodboardCount = page.getByText(/\d+개의 무드보드를 모았어요/);
    this.savedBoards = page.getByRole("region", { name: "저장한 무드보드" });
    this.retryPanel = page.getByText("저장한 보드를 불러오지 못했어요.");
    this.retryButton = page.getByRole("button", {
      name: /^(다시 시도|다시 불러오는 중)$/,
    });
  }

  async goto() {
    await this.page.goto("/");
  }

  /** History 카드 — 접근성 이름은 "{typeName} · {title} 결과 열람하기" 다. */
  moodboardCard(typeName: string, title: string): Locator {
    return this.page.getByRole("link", {
      name: `${typeName} · ${title} 결과 열람하기`,
    });
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
