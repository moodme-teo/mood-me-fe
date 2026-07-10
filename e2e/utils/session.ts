import type { Page } from "@playwright/test";

import { GUEST_SESSION_ID } from "../fixtures/data";

// FirstEntryLanding 이 읽는 플래그. 첫진입 스플래시(2.6초)를 건너뛴다.
const SPLASH_SEEN_KEY = "moodme:first-entry-splash-seen";

// lib/auth/guest-session.ts 의 STORAGE_KEY 와 같아야 한다.
const GUEST_SESSION_KEY = "mood-me:guest-session-id";

export async function skipSplash(page: Page) {
  await page.addInitScript((key) => {
    try {
      sessionStorage.setItem(key, "1");
    } catch {
      // 프라이빗 모드 등 — 스플래시가 재생될 뿐 기능엔 영향 없음
    }
  }, SPLASH_SEEN_KEY);
}

/**
 * 게스트 세션 id 를 localStorage 에 심는다.
 *
 * HomeExperience 는 `!isLoggedIn && guestSessionId` 일 때만 GET /api/moodboards 로
 * 목록을 다시 불러온다. 이 시드가 없으면 저장 보드 조회 자체가 일어나지 않아
 * 홈이 항상 첫진입(FirstEntryLanding)으로 남는다.
 */
export async function seedGuestSession(
  page: Page,
  guestSessionId: string = GUEST_SESSION_ID,
) {
  await page.addInitScript(
    ([key, id]) => {
      try {
        localStorage.setItem(key, id);
      } catch {
        // 프라이빗 모드 등 — 목록 조회가 생략될 뿐 앱은 정상 동작
      }
    },
    [GUEST_SESSION_KEY, guestSessionId] as const,
  );
}
