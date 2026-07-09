import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
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
  projects: [{ name: "mobile-chromium", use: { ...devices["Pixel 5"] } }],

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
