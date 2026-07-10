import type { Metadata } from "next";
import "@/app/globals.css";

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
    <html lang="ko" className="h-full bg-[var(--gray-900)] antialiased">
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
