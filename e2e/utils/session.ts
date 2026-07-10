import type { Page } from "@playwright/test";

import {
  BASE_IMAGE_URL,
  GUEST_SESSION_ID,
  MOODBOARD_ID,
} from "../fixtures/data";

// FirstEntryLanding 이 읽는 플래그. 첫진입 스플래시(2.6초)를 건너뛴다.
const SPLASH_SEEN_KEY = "moodme:first-entry-splash-seen";

// lib/auth/guest-session.ts 의 STORAGE_KEY 와 같아야 한다.
const GUEST_SESSION_KEY = "mood-me:guest-session-id";

// lib/mood-test/draft-storage.ts 의 STORAGE_KEY 와 같아야 한다.
const TEST_DRAFT_KEY = "mood-me:test-draft:v1";

// components/board/moodboard-draft-storage.ts 의 DB 규격과 같아야 한다.
const DRAFT_DB = { name: "mood-me", version: 1, store: "moodboard-drafts" };

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

/**
 * 진행 중인 추구미 테스트 드래프트를 심는다 (§5.7 — 진행 상태는 클라이언트 보존).
 *
 * 홈의 "이어서 만들기" 는 이 드래프트를 읽어 `{stepIndex + 1}단계` 라벨을 붙이고
 * `/test/{sessionId}?step={stepIndex}` 로 보낸다. localStorage 라 시드가 간단하다.
 */
export async function seedMoodTestDraft(
  page: Page,
  draft: { sessionId: string; stepIndex: number; updatedAt: string },
) {
  await page.addInitScript(
    ([key, value]) => {
      try {
        localStorage.setItem(key, value);
      } catch {
        // 프라이빗 모드 등 — "이어서 만들기" 가 안 뜰 뿐 앱은 정상 동작
      }
    },
    [TEST_DRAFT_KEY, JSON.stringify(draft)] as const,
  );
}

/**
 * 편집 중인 무드보드 드래프트를 심는다 (§5.7 — 편집 드래프트는 IndexedDB).
 *
 * 요소가 많아지면 localStorage 의 용량·동기 API 한계를 넘으므로 편집 드래프트만
 * IndexedDB 를 쓴다. 홈의 "이어서 만들기" 는 이걸 읽어 `편집 중` 라벨을 붙인다.
 */
export async function seedMoodboardDraft(
  page: Page,
  draft: { moodboardId: string; updatedAt: string },
) {
  await page.addInitScript(
    ([db, record]) => {
      // 페이지 스크립트보다 먼저 도는 시드라, 앱이 열기 전에 스토어를 만들어 둔다.
      const request = indexedDB.open(db.name, db.version);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(db.store)) {
          database.createObjectStore(db.store, { keyPath: "moodboardId" });
        }
      };
      request.onsuccess = () => {
        const database = request.result;
        const transaction = database.transaction(db.store, "readwrite");
        transaction.objectStore(db.store).put(record);
        transaction.oncomplete = () => database.close();
      };
    },
    [
      DRAFT_DB,
      {
        moodboardId: draft.moodboardId,
        baseImageUrl: BASE_IMAGE_URL,
        elements: [],
        updatedAt: draft.updatedAt,
      },
    ] as const,
  );
}

/** 시드 편의값 — spec 이 id 를 직접 다루지 않아도 되게 한다. */
export const DRAFT_MOODBOARD_ID = MOODBOARD_ID;
