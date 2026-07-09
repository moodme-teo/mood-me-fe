import { expect, type Page } from "@playwright/test";

// 추구미 테스트는 8개 화면(담기 12 → 덜어내기 4 → 3 → 그림자 3 → 전환×3 → 최종 5)이다.
// 화면 종류를 몰라도 넘길 수 있도록, 선택지 버튼의 aria-pressed 와
// "N / M 선택됨" 상태 텍스트만으로 목표치를 채우고 다음으로 넘긴다.
// (data-testid 를 새로 뿌리지 않기 위한 선택 — mood-test-flow.ts 의 TOTAL_SCREENS 와 맞춘다.)
const TOTAL_SCREENS = 8;

const SELECTION_PATTERN = /(\d+)\s*\/\s*(\d+)\s*선택됨/;

function parseSelection(text: string) {
  const matched = text.match(SELECTION_PATTERN);
  if (!matched) {
    throw new Error(
      `선택 상태 텍스트를 읽지 못했습니다: ${JSON.stringify(text)}`,
    );
  }
  return { picked: Number(matched[1]), target: Number(matched[2]) };
}

async function fillCurrentScreen(page: Page) {
  const status = page.locator('p[role="status"]');
  const unpicked = page.locator('button[aria-pressed="false"]:not([disabled])');

  for (;;) {
    const { picked, target } = parseSelection(await status.innerText());
    if (picked >= target) return;

    await unpicked.first().click();
    // 클릭이 상태에 반영될 때까지 기다린다 — 즉시 다시 읽으면 stale 값으로 과선택할 수 있다.
    await expect(status).toContainText(`${picked + 1} / ${target} 선택됨`);
  }
}

/**
 * 추구미 테스트를 첫 화면부터 끝까지 완주한다.
 * 마지막 화면에서 "무드보드 생성하기"를 누르면 생성중 화면으로 이동한다.
 */
export async function completeMoodTest(page: Page) {
  const nextButton = page.getByRole("button", {
    name: /^(다음|무드보드 생성하기)/,
  });

  for (let screen = 0; screen < TOTAL_SCREENS; screen += 1) {
    await fillCurrentScreen(page);
    await nextButton.click();
  }
}
