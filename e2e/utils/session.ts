import type { Page } from "@playwright/test";

import type { CommittedState } from "@/lib/mood-test/flow-state";

import { GUEST_SESSION_ID } from "../fixtures/data";

// FirstEntryLanding 이 읽는 플래그. 첫진입 스플래시(2.6초)를 건너뛴다.
const SPLASH_SEEN_KEY = "moodme:first-entry-splash-seen";

// lib/auth/guest-cookie.ts 의 GUEST_SESSION_COOKIE 와 같아야 한다.
const GUEST_SESSION_COOKIE = "mood-me-guest-session";

// lib/mood-test/draft-storage.ts 의 STORAGE_KEY 와 같아야 한다.
const TEST_DRAFT_KEY = "mood-me:test-draft:v1";

// lib/mood-test/draft-storage.ts 의 DRAFT_SCHEMA_VERSION 과 같아야 한다.
const DRAFT_SCHEMA_VERSION = 1;

// lib/mood-test/seed.ts 의 QUESTION_SET_VERSION 과 같아야 한다.
const QUESTION_SET_VERSION = "2026-07-07";

// 단계별 완료본의 빈 상태 — 홈은 stepIndex 만 읽으므로 여기선 채우지 않는다.
const EMPTY_COMMITTED: CommittedState = {
  selected: [],
  droppedR1: [],
  droppedR2: [],
  shadows: [],
  transitions: [null, null, null],
  final: [],
  droppedFinal: [],
  toggles: {},
};

// playwright.config.ts 의 BASE_URL 과 같아야 한다.
const BASE_URL = `http://localhost:${process.env.E2E_PORT ?? 3100}`;

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
 * 게스트 세션을 쿠키로 심는다.
 *
 * 신원은 httpOnly 쿠키에 있어 페이지 스크립트로는 넣을 수 없다 — 브라우저 컨텍스트에
 * 직접 넣는다 (#126, lib/auth/guest-cookie.ts). 예전에는 localStorage 에 심었다.
 *
 * 서버가 실제로 이 값을 읽지는 않는다 — E2E 는 Supabase 없이 뜨고 API 는 page.route 로
 * 가로챈다. 그래도 실제 브라우저 상태와 같게 두어야 인증 분기가 사실대로 굴러간다.
 */
export async function seedGuestSession(
  page: Page,
  guestSessionId: string = GUEST_SESSION_ID,
) {
  await page.context().addCookies([
    {
      name: GUEST_SESSION_COOKIE,
      value: guestSessionId,
      url: BASE_URL,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}

/**
 * 진행 중인 추구미 테스트 드래프트를 심는다 (§5.7 — 진행 상태는 클라이언트 보존).
 *
 * 홈의 "이어서 만들기" 는 이 드래프트를 읽어 `{stepIndex + 1}단계` 라벨을 붙이고
 * `/test/{sessionId}?step={stepIndex}` 로 보낸다. localStorage 라 시드가 간단하다.
 *
 * `questionSetVersion` 을 일부러 어긋나게 주면 "질문 세트가 바뀐 옛 드래프트"를 재현한다 (#121).
 */
export async function seedMoodTestDraft(
  page: Page,
  draft: {
    sessionId: string;
    stepIndex: number;
    updatedAt: string;
    questionSetVersion?: string;
    committed?: Partial<CommittedState>;
    screenDraft?: string[];
  },
) {
  const stored = {
    schemaVersion: DRAFT_SCHEMA_VERSION,
    questionSetVersion: draft.questionSetVersion ?? QUESTION_SET_VERSION,
    sessionId: draft.sessionId,
    stepIndex: draft.stepIndex,
    committed: { ...EMPTY_COMMITTED, ...draft.committed },
    screenDraft: draft.screenDraft ?? [],
    updatedAt: draft.updatedAt,
  };

  await page.addInitScript(
    ([key, value]) => {
      try {
        localStorage.setItem(key, value);
      } catch {
        // 프라이빗 모드 등 — "이어서 만들기" 가 안 뜰 뿐 앱은 정상 동작
      }
    },
    [TEST_DRAFT_KEY, JSON.stringify(stored)] as const,
  );
}

/** 손상된 드래프트(파싱 불가) 를 심는다 — 앱이 죽지 않아야 한다 (#121). */
export async function seedCorruptedMoodTestDraft(page: Page) {
  await page.addInitScript((key) => {
    try {
      localStorage.setItem(key, "{ not json");
    } catch {
      // 프라이빗 모드 등 — 검증 대상이 아니다
    }
  }, TEST_DRAFT_KEY);
}
