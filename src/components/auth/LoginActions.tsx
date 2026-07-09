"use client";

// 로그인 화면의 3개 버튼. PRD 5.1 — 카카오/구글은 Supabase OAuth 시작, 게스트는
// guest_session_id 발급 후 메인/홈으로 이동.

import { useRouter } from "next/navigation";
import { useState } from "react";

import { ensureGuestSessionId } from "@/lib/auth/guest-session";
import { createClient } from "@/lib/supabase/client";

export default function LoginActions() {
  const router = useRouter();
  const [isGuestLoading, setIsGuestLoading] = useState(false);

  const startOAuth = async (provider: "kakao" | "google") => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  const continueAsGuest = async () => {
    setIsGuestLoading(true);
    await ensureGuestSessionId();
    router.push("/");
  };

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => startOAuth("kakao")}
        className="w-full rounded-full bg-[#FEE500] py-4 text-sm font-semibold text-foreground shadow-card ring-ring transition-colors duration-200 ease-standard outline-none hover:bg-[#ffeb33] focus-visible:ring-2 active:bg-[#f4dc00]"
      >
        카카오로 시작하기
      </button>
      <button
        type="button"
        onClick={() => startOAuth("google")}
        className="w-full rounded-full border border-gray-300 bg-card py-4 text-sm font-semibold text-foreground ring-ring transition-colors duration-200 ease-standard outline-none hover:bg-surface-sunken focus-visible:ring-2 active:bg-gray-100"
      >
        구글로 시작하기
      </button>
      <button
        type="button"
        onClick={continueAsGuest}
        disabled={isGuestLoading}
        className="w-full py-3 text-sm text-muted-foreground underline disabled:opacity-50"
      >
        로그인 없이 둘러보기
      </button>
    </div>
  );
}
