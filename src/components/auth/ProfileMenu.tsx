"use client";

// 상단 프로필(아바타) 버튼 + 클릭 시 펼쳐지는 계정 메뉴(로그아웃). PRD 5.1 — 메인/홈 등
// 공통 헤더가 있는 화면에서 쓰인다. 로그인 여부·로그아웃 동작은 로그인 기능 이슈에서 연결.
// isLoggedIn은 지금은 더미 prop — 실제 로그인 상태 연동 전까지 겉모습만 토글해볼 용도.

import { useState } from "react";

type Props = {
  isLoggedIn?: boolean;
};

export default function ProfileMenu({ isLoggedIn = false }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={isLoggedIn ? "계정 메뉴 열기" : "로그인해서 보드 저장하기"}
        aria-expanded={open}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-300 bg-neutral-100 text-sm text-neutral-600"
      >
        {isLoggedIn ? "내" : "?"}
      </button>

      {open && isLoggedIn && (
        <div
          role="menu"
          aria-label="계정 메뉴"
          className="absolute top-11 right-0 min-w-32 rounded-lg border border-neutral-200 bg-white py-1 shadow-md"
        >
          <button
            type="button"
            role="menuitem"
            className="w-full px-4 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50"
          >
            로그아웃
          </button>
        </div>
      )}
    </div>
  );
}
