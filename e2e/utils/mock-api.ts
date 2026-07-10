import type { Page, Route } from "@playwright/test";

import {
  generationJob,
  GUEST_SESSION_ID,
  JOB_ID,
  LEGACY_MOODBOARD,
  MOODBOARD,
  MOODBOARD_ID,
  MOODBOARD_SUMMARIES,
} from "../fixtures/data";

// 목록(/api/moodboards)과 단건(/api/moodboards/{id})은 glob 로 구분하기 어려워
// pathname 을 정확히 비교한다. 쿼리스트링(guestSessionId)은 무시한다.
const isMoodboardListUrl = (url: URL) => url.pathname === "/api/moodboards";

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

// 재진입 시 새 job을 만들지 않는지(#115) 확인할 때 호출 횟수를 센다. 이 route가 나중에
// 등록될수록 우선하므로, mockCreateGenerationJob 뒤에 이어 붙여도 이게 실제 응답을 맡는다.
export async function mockCreateGenerationJobCounting(page: Page) {
  const state = { count: 0 };
  await page.route("**/api/mood-test-sessions/*/generate", (route) => {
    state.count += 1;
    return ok(route, { jobId: JOB_ID });
  });
  return state;
}

// 재시도 버튼 잠금(PRD §11)을 확인할 때 쓴다 — resolve() 를 부르기 전까지 POST
// .../generate 응답을 미뤄, 그사이 버튼이 disabled 상태를 유지하는지 관찰할 수 있게 한다.
export async function mockCreateGenerationJobPending(page: Page) {
  let resolveGate: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    resolveGate = resolve;
  });
  await page.route("**/api/mood-test-sessions/*/generate", async (route) => {
    await gate;
    return ok(route, { jobId: JOB_ID });
  });
  return { resolve: () => resolveGate() };
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

// 홈(History)이 부르는 저장 보드 목록.
export async function mockMoodboards(page: Page) {
  await page.route(isMoodboardListUrl, (route) =>
    ok(route, MOODBOARD_SUMMARIES),
  );
}

export async function mockMoodboardsFailure(page: Page) {
  await page.route(isMoodboardListUrl, (route) =>
    fail(route, 500, "INTERNAL_ERROR", "저장한 무드보드를 불러오지 못했어요."),
  );
}

// 크롭 결과 보드 — exportedImageUrl 이 있어 결과물 페이지가 <img> 로 렌더한다.
export async function mockMoodboard(page: Page) {
  await page.route("**/api/moodboards/*", (route) => ok(route, MOODBOARD));
}

// #102 이전 보드 — exportedImageUrl 이 없어 뷰어(BoardPreview)가 Konva 로 합성한다.
export async function mockLegacyMoodboard(page: Page) {
  await page.route("**/api/moodboards/*", (route) =>
    ok(route, LEGACY_MOODBOARD),
  );
}

export async function mockMoodboardFailure(page: Page) {
  await page.route("**/api/moodboards/*", (route) =>
    fail(route, 500, "INTERNAL_ERROR", "불러오지 못했어요."),
  );
}

// 편집 화면의 "완성하고 공유하기" 는 PATCH /api/moodboards/{id} 로 저장한다.
// 같은 URL 을 GET 으로도 쓰므로 PATCH 가 아니면 다른 핸들러로 넘긴다.
export async function mockSaveMoodboard(page: Page) {
  await page.route("**/api/moodboards/*", (route) => {
    if (route.request().method() !== "PATCH") return route.fallback();
    return ok(route, {
      id: MOODBOARD_ID,
      elements: MOODBOARD.elements,
      baseImageUrl: MOODBOARD.baseImageUrl,
      persisted: true,
    });
  });
}

export async function mockSaveMoodboardFailure(page: Page) {
  await page.route("**/api/moodboards/*", (route) => {
    if (route.request().method() !== "PATCH") return route.fallback();
    return fail(route, 500, "INTERNAL_ERROR", "저장하지 못했어요.");
  });
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
