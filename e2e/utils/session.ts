import type { Page } from "@playwright/test";

// FirstEntryLanding 이 읽는 플래그. 첫진입 스플래시(2.6초)를 건너뛴다.
const SPLASH_SEEN_KEY = "moodme:first-entry-splash-seen";

export async function skipSplash(page: Page) {
  await page.addInitScript((key) => {
    try {
      sessionStorage.setItem(key, "1");
    } catch {
      // 프라이빗 모드 등 — 스플래시가 재생될 뿐 기능엔 영향 없음
    }
  }, SPLASH_SEEN_KEY);
}
