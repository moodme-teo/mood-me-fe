import type { Metadata } from "next";
import { Instrument_Serif } from "next/font/google";
import "@/app/globals.css";

// Instrument Serif(영문 display)는 스플래시 첫 프레임에 큰 글자로 깔린다. next/font 가 빌드
// 때 받아 자체 호스팅하므로 HTML 과 같은 출처에서 preload 되고, 구글로 나가는 요청이 없다.
// 예전처럼 globals.css 에서 @import 하면 HTML → CSS → 구글 CSS → gstatic woff2 로 네 번
// 왕복한 뒤에야 글자가 제 폰트로 바뀌었다(FOUT).
const instrumentSerif = Instrument_Serif({
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-instrument-serif",
});

// 나머지 두 벌은 아직 외부에서 받는다 — 연결만 미리 열어 왕복 한 번을 줄인다.
// - Nanum Myeongjo(한글 display): next/font 의 서브셋 목록에 latin 밖에 없어 자체 호스팅하면
//   한글이 대체 폰트로 떨어진다. globals.css 의 @import 로 남겨둔다. 첫 화면에는 없다.
// - Pretendard(본문): globals.css 의 @font-face. CSS 를 파싱해야 비로소 폰트 요청이 나가므로,
//   첫 화면에서 실제로 쓰는 Medium 한 벌만 preload 해 시작 시점을 HTML 파싱 시점까지 끌어올린다.
const PRETENDARD_ORIGIN = "https://unpkg.com";
const PRETENDARD_MEDIUM = `${PRETENDARD_ORIGIN}/pretendard@1.3.9/dist/web/static/woff2/Pretendard-Medium.woff2`;
const GOOGLE_FONT_ORIGINS = [
  "https://fonts.googleapis.com",
  "https://fonts.gstatic.com",
] as const;

export const metadata: Metadata = {
  title: "mood·me",
  description: "짧은 테스트로 나만의 AI 무드보드를 만들고 공유하는 mood·me",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${instrumentSerif.variable} h-full bg-[var(--gray-900)] antialiased`}
    >
      {GOOGLE_FONT_ORIGINS.map((origin) => (
        <link
          key={origin}
          rel="preconnect"
          href={origin}
          crossOrigin="anonymous"
        />
      ))}
      <link rel="preconnect" href={PRETENDARD_ORIGIN} crossOrigin="anonymous" />
      <link
        rel="preload"
        as="font"
        type="font/woff2"
        href={PRETENDARD_MEDIUM}
        crossOrigin="anonymous"
      />
      {/* 화면마다 헤더 구성이 달라(로그인은 없음, 메인/홈/편집/결과물은 프로필·뒤로가기 등) 공통 헤더를
          루트에 고정하지 않는다. 화면별 topbar는 각 페이지가 직접 구성한다 (후속 이슈에서 구현).
          h-dvh로 뷰포트 높이에 고정 — 헤더/푸터가 있는 화면(예: 테스트)이 내부만 스크롤되고
          버튼이 하단에 붙어있게 하려면 높이가 min-height가 아니라 고정 height여야 한다. */}
      <body className="h-dvh overflow-hidden bg-transparent">
        {/* 앱 프레임을 body가 아니라 이 div가 맡는다. body에 두면 모달이 열릴 때
            radix의 스크롤 락(react-remove-scroll)이 body[data-scroll-locked]에
            `padding: 0 505px; margin-right: 0 !important` 를 꽂아 mx-auto 가운데 정렬을
            패딩으로 바꿔버린다 — max-w-[430px] 프레임이 패딩으로 꽉 차 내용이 사라진다.
            모바일에서는 전체 폭을 쓰고, 더 큰 화면에서는 모바일 평균 폭까지만 확장한다. */}
        <div className="mx-auto flex h-full w-full max-w-[430px] flex-col overflow-hidden bg-background">
          {children}
        </div>
      </body>
    </html>
  );
}
