import { defineConfig, devices } from "@playwright/test";

// reuseExistingServer 는 포트만 보고 붙는다 — 워크트리를 여러 개 띄워 두면 옆 워크트리의
// 서버(=다른 코드)를 상대로 테스트하게 된다. E2E_PORT 로 갈라서 돌린다.
const PORT = Number(process.env.E2E_PORT ?? 3100);
const BASE_URL = `http://localhost:${PORT}`;

// E2E 는 실제 Supabase/Elice 를 호출하지 않는다.
// - 클라이언트 fetch(lib/api-client.ts)는 각 spec 에서 page.route 로 가로챈다.
// - 서버 컴포넌트가 Supabase 를 부르지 않도록 아래 env 를 비워서 띄운다.
//   (src/app/page.tsx 의 canUseSupabase() 가 false 가 되어 홈이 결정론적으로 렌더된다.)
const SERVER_ENV = {
  NEXT_PUBLIC_SUPABASE_URL: "",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
  SUPABASE_SECRET_KEY: "",
  NEXT_PUBLIC_SITE_URL: BASE_URL,
  // Supabase 없이 도는 E2E 에서만 고정 fixture 소유자 검증을 허용한다.
  // 서비스 키 부재만으로 검증을 통과시키지 않도록 명시 플래그를 따로 둔다.
  MOOD_ME_E2E_MOCK_OWNER: "1",
};

// dev 서버가 아니라 프로덕션 빌드로 띄운다 — Next 16 은 같은 디렉터리에서 dev 서버를 두 개
// 띄우지 못해 로컬 개발 서버와 충돌하고, 빌드 산출물이 CI 와 같아 결과도 안정적이다.
// CI 에서는 앞선 Build 스텝의 .next 를 재사용하므로 빌드를 다시 하지 않는다.
const START_COMMAND = `npx next start --port ${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }]]
    : [["list"]],

  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    // framer-motion 전환을 즉시 끝내 애니메이션 대기로 인한 flaky 를 없앤다.
    contextOptions: { reducedMotion: "reduce" },
  },

  // 무드미는 모바일 우선(PRD §11)이라 모바일 뷰포트를 기본 프로젝트로 둔다.
  //
  // visual 을 별도 프로젝트로 갈라 두는 이유: 스냅샷 비교는 폰트 렌더링·GPU 래스터라이즈에
  // 의존해 러너가 바뀌면 깨진다. CI 는 `npm run e2e`(= --project=mobile-chromium)만 돌리므로
  // 스냅샷이 CI 에 실려 가지 않는다 (docs/convention/qa.md §Visual regression).
  projects: [
    {
      name: "mobile-chromium",
      use: { ...devices["Pixel 5"] },
      testIgnore: "**/visual/**",
    },
    {
      name: "visual",
      use: { ...devices["Pixel 5"] },
      testMatch: "**/visual/**/*.spec.ts",
    },
  ],

  // 기준 이미지는 커밋하지 않는다 (.gitignore) — 각자 자기 기기에서 만들어 쓴다.
  // 그래서 Playwright 기본 경로(스펙 옆 `*-snapshots/`)에 두지 않고 한 폴더로 모은다.
  // 무시 규칙 한 줄로 덮이고, 지울 때도 이 폴더만 지우면 된다.
  snapshotPathTemplate: "{testDir}/visual/__screenshots__/{arg}{ext}",

  webServer: {
    command: process.env.CI
      ? START_COMMAND
      : `npm run build && ${START_COMMAND}`,
    url: BASE_URL,
    env: SERVER_ENV,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
  },
});
