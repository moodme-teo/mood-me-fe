import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "@/app/globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      {/* 화면마다 헤더 구성이 달라(로그인은 없음, 메인/홈/편집/결과물은 프로필·뒤로가기 등) 공통 헤더를
          루트에 고정하지 않는다. 화면별 topbar는 각 페이지가 직접 구성한다 (후속 이슈에서 구현).
          h-dvh로 뷰포트 높이에 고정 — 헤더/푸터가 있는 화면(예: 테스트)이 내부만 스크롤되고
          버튼이 하단에 붙어있게 하려면 body가 min-height가 아니라 고정 height여야 한다. */}
      <body className="flex h-dvh flex-col">{children}</body>
    </html>
  );
}
