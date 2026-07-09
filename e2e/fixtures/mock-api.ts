import type { Page, Route } from "@playwright/test";

import { generationJob, GUEST_SESSION_ID, JOB_ID, MOODBOARD } from "./data";

// lib/api-client.ts 의 응답 규약: 성공은 { data }, 실패는 { error: { code, message } }.
function ok(route: Route, data: unknown) {
  return route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ data }),
  });
}

function fail(route: Route, status: number, code: string, message: string) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify({ error: { code, message } }),
  });
}

// 첫진입 스플래시(2.6초)를 건너뛴다. sessionStorage 플래그는 FirstEntryLanding 이 읽는다.
export async function skipSplash(page: Page) {
  await page.addInitScript(() => {
    try {
      sessionStorage.setItem("moodme:first-entry-splash-seen", "1");
    } catch {
      // 프라이빗 모드 등 — 스플래시가 재생될 뿐 기능엔 영향 없음
    }
  });
}

export async function mockGuestSession(page: Page) {
  await page.route("**/api/guest-sessions", (route) =>
    ok(route, { id: GUEST_SESSION_ID }),
  );
}

export async function mockSaveMoodTestSession(page: Page) {
  await page.route("**/api/mood-test-sessions", (route) =>
    ok(route, { id: "session-1", status: "completed" }),
  );
}

export async function mockCreateGenerationJob(page: Page) {
  await page.route("**/api/mood-test-sessions/*/generate", (route) =>
    ok(route, { jobId: JOB_ID }),
  );
}

export async function mockCreateGenerationJobFailure(page: Page) {
  await page.route("**/api/mood-test-sessions/*/generate", (route) =>
    fail(route, 500, "GENERATION_FAILED", "생성을 시작하지 못했어요."),
  );
}

type JobStep = { status: Parameters<typeof generationJob>[0]; percent: number };

// 폴링될 때마다 다음 단계를 돌려준다. 마지막 단계는 이후 호출에서도 계속 유지된다.
export async function mockGenerationJobSequence(page: Page, steps: JobStep[]) {
  let index = 0;
  await page.route("**/api/mood-test-sessions/*/generation-job", (route) => {
    const step = steps[Math.min(index, steps.length - 1)];
    index += 1;
    return ok(route, generationJob(step.status, step.percent));
  });
}

export async function mockMoodboard(page: Page) {
  await page.route("**/api/moodboards/*", (route) => ok(route, MOODBOARD));
}

// 생성중 화면이 곧바로 호출하는 두 엔드포인트를 성공 경로로 묶어 세팅한다.
export async function mockGenerationSuccess(page: Page) {
  await mockCreateGenerationJob(page);
  await mockGenerationJobSequence(page, [
    { status: "queued", percent: 5 },
    { status: "processing", percent: 60 },
    { status: "completed", percent: 100 },
  ]);
}
