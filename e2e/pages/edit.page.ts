import type { Locator, Page } from "@playwright/test";

// MoodboardEditor 의 하단 도구 바 — ToolButton 은 aria-label="{label} 도구" + aria-pressed 를 노출한다.
export type ToolLabel = "이동" | "스티커" | "글자" | "펜" | "지우개";

// 저장 후 이동하는 곳. moodboardId 는 편집 화면 진입 때마다 서버가 randomUUID 로 새로 발급하므로
// 값을 미리 알 수 없다 (PRD §5.7 — 완성 전까지 서버에 쓰지 않는다).
const MOODBOARD_URL = /\/moodboard\/[0-9a-f-]{36}$/;

export class EditPage {
  readonly canvas: Locator;
  readonly backButton: Locator;
  readonly completeButton: Locator;
  readonly undoButton: Locator;
  readonly deleteSelectedButton: Locator;
  readonly addTextButton: Locator;
  readonly textContentInput: Locator;
  readonly toast: Locator;

  /** 뒤로 → 확인 다이얼로그 (window.confirm 이 아니라 인앱 dialog 라 자동화로 다룰 수 있다) */
  readonly leaveDialog: Locator;
  readonly leaveConfirmButton: Locator;
  readonly leaveCancelButton: Locator;

  /** base 이미지 로드 실패 화면 */
  readonly baseImageError: Locator;
  readonly baseImageRetryButton: Locator;

  constructor(private readonly page: Page) {
    this.canvas = page.locator("canvas").first();
    this.backButton = page.getByRole("button", { name: "뒤로" });
    this.completeButton = page.getByRole("button", {
      name: /^(완성하고 공유하기|저장 중)$/,
    });
    this.undoButton = page.getByRole("button", { name: "Undo" });
    this.deleteSelectedButton = page.getByRole("button", { name: "선택 삭제" });
    this.addTextButton = page.getByRole("button", { name: "텍스트 박스 추가" });
    this.textContentInput = page.getByPlaceholder("무드 한 줄");
    this.toast = page.locator('div[role="status"]');

    this.leaveDialog = page.getByRole("dialog", {
      name: "저장하지 않고 나가시겠어요?",
    });
    this.leaveConfirmButton = page.getByRole("button", { name: "나가기" });
    this.leaveCancelButton = page.getByRole("button", { name: "계속 편집" });

    this.baseImageError = page.getByText("이미지를 불러오지 못했어요.");
    this.baseImageRetryButton = page.getByRole("button", { name: "다시 시도" });
  }

  async goto(sessionId: string) {
    await this.page.goto(`/test/${sessionId}/edit`);
  }

  tool(label: ToolLabel): Locator {
    return this.page.getByRole("button", { name: `${label} 도구` });
  }

  async selectTool(label: ToolLabel) {
    await this.tool(label).click();
  }

  /** 스티커 패널의 에셋 버튼 — STICKER_ASSETS 의 label 로 찾는다. */
  sticker(label: string): Locator {
    return this.page.getByRole("button", { name: label, exact: true });
  }

  async complete() {
    await this.completeButton.click();
  }

  async waitForResult() {
    await this.page.waitForURL(MOODBOARD_URL);
  }

  /** job 이 completed 가 아니면 서버가 생성중 화면으로 redirect 한다. */
  async waitForGeneratingRedirect(sessionId: string) {
    await this.page.waitForURL(`**/test/${sessionId}/generating`);
  }
}
