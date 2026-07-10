import { expect, test } from "@playwright/test";

import { MOODBOARD_SUMMARIES, TEST_SESSION_ID } from "./fixtures/data";
import { HomePage } from "./pages/home.page";
import { MoodTestPage } from "./pages/mood-test.page";
import { mockMoodboards, mockMoodboardsFailure } from "./utils/mock-api";
import {
  seedGuestSession,
  seedMoodTestDraft,
  skipSplash,
} from "./utils/session";

/**
 * 테스트 대상: 홈 진입 분기 (`/`) — 메인(PRD §5.2)과 History(§5.2-A)
 *
 * 핵심 여정의 관문이다. 같은 경로가 저장 보드 유무에 따라 다른 화면을 렌더한다.
 *
 *   [앱 실행 · 게스트 우선 진입]              ← 로그인 강제 없음 (§5.1)
 *          │                                    (프로필 버튼 → 로그인 / 로그인 시 로그아웃 메뉴)
 *          ├─ 저장된 보드 있음 ──▶ [홈(History) · 저장 보드 목록] ──┐
 *          │                                                          │ (무드보드 만들기)
 *          └─ 저장된 보드 없음 ──▶ [메인 페이지] ─────────────────────┤
 *                                                                     ▼
 *                                                          [추구미 테스트 /test/:sessionId]
 *
 * 분기 조건은 HomeExperience 의 `shouldShowHistory = 보드 1개 이상 || 로딩 중 || 에러` 다.
 * 즉 목록 로드에 실패해도 History 셸이 뜨고 그 안에 재시도 패널이 놓인다 — 메인으로
 * 떨어지지 않는다. 저장한 보드가 있었다는 사실을 에러가 지워선 안 되기 때문이다.
 *
 * 시나리오:
 * - 게스트가 로그인 없이 곧바로 진입한다 (§5.1 — 첫 진입 강제 화면·모달 없음).
 * - 보드가 없으면 메인, CTA 를 누르면 새 sessionId 가 발급되고 추구미 테스트로 간다 (§5.2).
 * - 보드가 있으면 History 가 뜨고, "N개의 무드보드를 모았어요" 카운트와 카드가 보인다.
 *   카드를 탭하면 그 보드의 결과물 페이지로 이동한다 (§5.2-A 동작).
 * - 진행 중인 작업이 있으면 "이어서 만들기" 로 마지막 지점에 복귀한다 (§5.7).
 * - 목록을 못 불러오면 History 안에 재시도 패널이 뜬다.
 *
 * "이어서 만들기" 는 추구미 테스트 드래프트만 본다 (§5.7 — 진행 상태는 서버가 아니라
 * 클라이언트에 둔다). localStorage `mood-me:test-draft:v1` → 라벨 "N단계".
 * 편집 드래프트(IndexedDB, 라벨 "편집 중")는 #134 가 저장소째 제거하며 사라졌다.
 * 링크는 메인·History 양쪽에 모두 나온다.
 *
 * 테스트 성격: smoke (+ 목록 로드 실패는 edge case)
 *
 * 전제 조건:
 * - skipSplash 로 첫진입 스플래시(2.6초)를 건너뛴다.
 * - 홈은 저장 보드를 두 번 조회한다.
 *     ① 서버 컴포넌트의 getMoodboardSummaries() — Supabase env 가 비어 있어 항상 `[]`.
 *        (page.tsx 의 canUseSupabase() 는 로그인 여부만 가른다. 목록 조회는 그 바깥이다)
 *     ② HomeExperience 의 useEffect 가 부르는 GET /api/moodboards — 브라우저 fetch 라
 *        page.route 로 가로챌 수 있다. 게스트(`!isLoggedIn`)일 때만 돈다. 게스트 신원은
 *        httpOnly 쿠키라 클라이언트가 존재 여부를 알 수 없어, 서버가 판단한다 (#126).
 *   그래서 메인 상태는 mock 없이, History 상태는 mockMoodboards 로 만든다.
 *
 * 테스트하지 않는 것:
 * - 로그인 화면 (§5.1) — 카카오·구글 OAuth 리디렉션이라 핵심 여정 밖이다
 * - 프로필(아바타) 버튼의 계정 메뉴·로그아웃 (§5.1)
 * - 회원(로그인) History — 서버에서 supabase.auth.getUser() 를 타므로 mock 되지 않는다.
 *   게스트 History 와 렌더 경로가 같아 잃는 커버리지는 귀속 로직뿐이다.
 * - 이어간 뒤 실제로 그 단계의 선택값이 복원되는지 — 드래프트가 sessionId·stepIndex 만
 *   담고 선택값은 담지 않는다. 복원은 추구미 테스트 화면의 몫이라 여기서는 이동까지만 본다.
 * - 스플래시 애니메이션 자체
 */
test.describe("홈", () => {
  test.beforeEach(async ({ page }) => {
    await skipSplash(page);
  });

  test("게스트가 로그인 없이 첫진입 화면을 본다", async ({ page }) => {
    const home = new HomePage(page);

    await home.goto();

    await expect(home.createButton).toBeVisible();
  });

  test("Create 를 누르면 추구미 테스트로 이동한다", async ({ page }) => {
    const home = new HomePage(page);
    const moodTest = new MoodTestPage(page);

    await home.goto();
    await home.startMoodTest();

    await expect(moodTest.nextButton).toBeVisible();
  });

  test("저장한 보드가 있으면 History 를 보여준다", async ({ page }) => {
    await seedGuestSession(page);
    await mockMoodboards(page);

    const home = new HomePage(page);
    await home.goto();

    await expect(home.historyHeading).toBeVisible();
    await expect(home.moodboardCount).toContainText(
      `${MOODBOARD_SUMMARIES.length}개의 무드보드를 모았어요`,
    );

    const [saved] = MOODBOARD_SUMMARIES;
    await expect(home.moodboardCard(saved.typeName, saved.title)).toBeVisible();
  });

  test("History 카드를 누르면 결과물 페이지로 이동한다", async ({ page }) => {
    await seedGuestSession(page);
    await mockMoodboards(page);

    const home = new HomePage(page);
    await home.goto();

    const [saved] = MOODBOARD_SUMMARIES;
    await home.moodboardCard(saved.typeName, saved.title).click();

    await page.waitForURL(`**/moodboard/${saved.id}`);
  });

  // "이어서 만들기" 는 진행 중인 작업이 있을 때만 뜬다 (§5.7 — 진행 상태는 클라이언트 보존).
  test("진행 중인 테스트가 있으면 이어서 만들기를 보여준다", async ({
    page,
  }) => {
    await seedMoodTestDraft(page, {
      sessionId: TEST_SESSION_ID,
      stepIndex: 2,
      updatedAt: "2026-07-09T10:00:00.000Z",
    });

    const home = new HomePage(page);
    await home.goto();

    // 라벨은 stepIndex + 1 — 사용자에겐 0부터가 아니라 1부터 센다.
    await expect(home.continueLink).toContainText("3단계");

    await home.continueLink.click();

    await page.waitForURL(`**/test/${TEST_SESSION_ID}?step=2`);
  });

  // "편집 중인 보드를 이어서 만들기" 는 #134 가 IndexedDB 초안 저장소(moodboard-draft-storage)를
  // 지우면서 함께 사라졌다 — 그 기능을 덮던 두 테스트를 여기서 정리한다. 지금 "이어서 만들기" 는
  // 추구미 테스트 드래프트 하나만 본다.

  test("진행 중인 작업이 없으면 이어서 만들기를 숨긴다", async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();

    await expect(home.createButton).toBeVisible();
    await expect(home.continueLink).toBeHidden();
  });

  test("저장한 보드를 불러오지 못하면 다시 시도를 보여준다", async ({
    page,
  }) => {
    await seedGuestSession(page);
    await mockMoodboardsFailure(page);

    const home = new HomePage(page);
    await home.goto();

    await expect(home.retryPanel).toBeVisible();
    await expect(home.retryButton).toBeEnabled();
  });
});
