"use client";

// 상단 프로필(아바타) 버튼 + 클릭 시 펼쳐지는 계정 메뉴(로그아웃). PRD 5.1 — 메인/홈 등
// 공통 헤더가 있는 화면에서 쓰인다. isLoggedIn은 부모(Server Component)가
// auth.getUser()로 확인해 내려준다 — 여기서 다시 확인하지 않는다.

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { createClient } from "@/lib/supabase/client";

type Props = {
  isLoggedIn?: boolean;
};

export default function ProfileMenu({ isLoggedIn = false }: Props) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setOpen(false);
    router.push("/");
    router.refresh();
  };

  // 비로그인 상태에서는 프로필 버튼이 로그인 화면으로 이동하는 진입점이다 (PRD 5.1).
  const handleProfileClick = () => {
    if (!isLoggedIn) {
      router.push("/login");
      return;
    }
    setOpen((prev) => !prev);
  };

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !containerRef.current?.contains(event.target)
      ) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={handleProfileClick}
        aria-label={isLoggedIn ? "계정 메뉴 열기" : "로그인해서 보드 저장하기"}
        aria-expanded={open}
        className="flex h-11 w-11 items-center justify-center rounded-full border border-gray-300 bg-surface-sunken text-sm font-bold text-muted-foreground ring-ring outline-none focus-visible:ring-2"
      >
        {isLoggedIn ? "내" : "?"}
      </button>

      {open && isLoggedIn && (
        <div
          aria-label="계정 메뉴"
          className="absolute top-11 right-0 min-w-32 rounded-lg border border-gray-100 bg-card py-1 shadow-md"
        >
          <button
            type="button"
            onClick={logout}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 ring-ring outline-none hover:bg-surface-sunken focus-visible:ring-2"
          >
            로그아웃
          </button>
        </div>
      )}
    </div>
  );
}
