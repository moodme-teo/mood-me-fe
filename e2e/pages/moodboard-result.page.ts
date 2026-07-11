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
 * - "다시 만들기" 가 곧바로 이동하지 않고 확인 다이얼로그를 먼저 연다는 흐름
 * - "이미지 저장" 은 곧바로 다운로드하지 않고 PNG/JPG 선택 시트를 먼저 연다는 흐름(#113)
 * - 시나리오(justCompleted/history/shared)에 따라 "다시 만들기"·삭제·공유 버튼 유무가
 *   달라진다는 사실 (#157) — goto()는 history, gotoJustCompleted()는 justCompleted를 만든다.
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
  readonly deleteFailedToast: Locator;

  /** 분석(GPT-5) 실패 시 그래프 자리에 뜨는 재시도 UI (#122). */
  readonly analysisFailedHeading: Locator;
  readonly retryAnalysisButton: Locator;
  readonly moodSpectrumHeading: Locator;

  /** "다시 만들기" → 확인 다이얼로그. window.confirm 이 아니라 인앱 dialog 다. */
  readonly restartButton: Locator;
  readonly restartDialog: Locator;
  readonly restartConfirmButton: Locator;
  readonly restartCancelButton: Locator;

  /** history 시나리오 전용 — "삭제" → 확인 다이얼로그 (#157). */
  readonly deleteButton: Locator;
  readonly deleteDialog: Locator;
  readonly deleteConfirmButton: Locator;
  readonly deleteCancelButton: Locator;

  /** !owner(공유) 전용 — SNS 공유 대신 뜨는 신규 유입 CTA (#157). */
  readonly tryItYourselfButton: Locator;

  constructor(private readonly page: Page) {
    this.exportedImage = page.getByRole("img", { name: "크롭한 무드 이미지" });
    this.canvas = page.locator("canvas").first();
    this.exportButton = page.getByRole("button", { name: "이미지 저장" });
    this.shareButton = page.getByRole("button", { name: "SNS 공유" });
    this.savedToast = page.getByText("PNG 이미지로 저장했어요.");
    // "SNS 공유" 는 공유 시트가 아니라 링크를 클립보드에 복사한다.
    this.copiedToast = page.getByText("공유 링크를 복사했어요.");
    this.editLink = page.getByRole("link", { name: "편집" });
    this.errorMessage = page.getByText("결과를 불러오지 못했어요.");
    this.deleteFailedToast = page.getByText(
      "삭제하지 못했어요. 다시 시도해 주세요.",
    );

    this.analysisFailedHeading =
      page.getByText("무드 성향을 읽어내지 못했어요.");
    this.retryAnalysisButton = page.getByRole("button", {
      name: /분석 다시 시도/,
    });
    this.moodSpectrumHeading = page.getByText("무드 성향 5축");

    this.restartButton = page.getByRole("button", { name: "다시 만들기" });
    this.restartDialog = page.getByRole("dialog", {
      name: "처음부터 다시 만들까요?",
    });
    this.restartConfirmButton = page.getByRole("button", {
      name: "새로 시작할게요",
    });
    this.restartCancelButton = page.getByRole("button", {
      name: "그대로 볼게요",
    });

    this.deleteButton = page.getByRole("button", { name: "무드보드 삭제" });
    this.deleteDialog = page.getByRole("dialog", {
      name: "이 무드보드를 삭제할까요?",
    });
    this.deleteConfirmButton = page.getByRole("button", {
      name: "삭제할게요",
    });
    this.deleteCancelButton = page.getByRole("button", { name: "취소" });

    this.tryItYourselfButton = page.getByRole("button", {
      name: "나도 만들어보기",
    });
  }

  async goto(moodboardId: string) {
    await this.page.goto(`/moodboard/${moodboardId}`);
  }

  /** MoodboardCropEditor 의 완료 리다이렉트를 흉내낸다 — justCompleted 시나리오 진입점. */
  async gotoJustCompleted(moodboardId: string) {
    await this.page.goto(`/moodboard/${moodboardId}?from=complete`);
  }

  typeName(name: string): Locator {
    return this.page.getByText(name);
  }

  /** "이미지 저장" → 시트에서 PNG 선택 → 다운로드 이벤트를 받아 돌려준다(#113 2단계 플로우). */
  async exportPng(): Promise<Download> {
    await this.exportButton.click();
    const download = this.page.waitForEvent("download");
    await this.page
      .getByRole("button", { name: "PNG로 저장 (투명 유지)" })
      .click();
    return download;
  }
}
