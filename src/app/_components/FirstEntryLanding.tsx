"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import BoardCardStack from "@/app/_components/first-entry/BoardCardStack";
import SplashScene from "@/app/_components/first-entry/SplashScene";
import ProfileMenu from "@/components/auth/ProfileMenu";

// 첫진입(메인) 화면 — 저장 보드가 0개일 때의 얼굴. 스플래시(≈2.6초)가 화면 이동 없이
// 애니메이션으로 첫진입 화면으로 이어지고(디자인 시안), 상단에서 이미지 카드가 떨어져
// 흩뿌려진 배치로 자리잡는다. 카드 무리는 세로 스와이프/스크롤 가능.
// 스플래시는 세션당 1회만 재생(sessionStorage) — 반복 진입 마찰 제거.

export type ContinueTarget = {
  href: string;
  label: string;
  updatedAt: string;
};

type Props = {
  isLoggedIn: boolean;
  continueTarget: ContinueTarget | null;
  onCreate: () => void;
};

type Phase = "splash" | "entry";

const SPLASH_SEEN_KEY = "moodme:first-entry-splash-seen";
const SPLASH_DURATION_MS = 2600;

export default function FirstEntryLanding({
  isLoggedIn,
  continueTarget,
  onCreate,
}: Props) {
  const prefersReduced = useReducedMotion();
  const reduced = prefersReduced ?? false;
  const [phase, setPhase] = useState<Phase>("splash");

  const skipToEntry = useCallback(() => {
    setPhase("entry");
    try {
      sessionStorage.setItem(SPLASH_SEEN_KEY, "1");
    } catch {
      // sessionStorage 접근 불가(프라이빗 모드 등) — 스플래시만 매번 재생될 뿐 기능엔 영향 없음
    }
  }, []);

  useEffect(() => {
    let alreadySeen = false;
    try {
      alreadySeen = sessionStorage.getItem(SPLASH_SEEN_KEY) === "1";
    } catch {
      alreadySeen = false;
    }

    // 이미 본 세션이면 스플래시를 건너뛴다(delay 0). 모션 최소화 선호 시에도
    // 스플래시 자체는 그대로 노출하고(2.6초), 등장·전환 애니메이션만 끈다
    // (DESIGN.md: reduced-motion 대안은 "제거"가 아니라 "즉시 전환"). 전환은 항상
    // 타이머 콜백에서 일어나 이펙트 본문의 동기 setState 를 피한다.
    const delay = alreadySeen ? 0 : SPLASH_DURATION_MS;
    const timer = window.setTimeout(skipToEntry, delay);
    return () => window.clearTimeout(timer);
  }, [skipToEntry]);

  const isEntry = phase === "entry";

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-surface-page">
      {/* 스플래시 동안 화면을 탭하면 건너뛴다(아바타 영역 제외 — 아래 z-30) */}
      {!isEntry && (
        <button
          type="button"
          onClick={skipToEntry}
          aria-label="시작 화면 건너뛰기"
          className="absolute inset-0 z-[25] cursor-default"
          tabIndex={-1}
        />
      )}

      <BoardCardStack active={isEntry} reduced={reduced} />
      <SplashScene phase={phase} reduced={reduced} />

      {/* 상단 프로필(아바타) — 두 페이즈 상시 노출 (PRD §6) */}
      <div className="absolute top-3 right-4 z-30">
        <ProfileMenu isLoggedIn={isLoggedIn} />
      </div>

      {/* 하단 CTA 영역 — 첫진입에서만 페이드인 */}
      <AnimatePresence>
        {isEntry && (
          <motion.div
            className="absolute inset-x-0 bottom-0 z-30 flex flex-col gap-2 px-5 pt-6 pb-[max(env(safe-area-inset-bottom),1.25rem)]"
            style={{
              background:
                "linear-gradient(to top, var(--surface-page) 42%, transparent)",
            }}
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: reduced ? 0 : 0.5,
              ease: [0.22, 1, 0.36, 1],
              delay: reduced ? 0 : 0.35,
            }}
          >
            {continueTarget && (
              <Link
                href={continueTarget.href}
                className="flex items-center justify-between rounded-[var(--radius-md)] bg-surface-sunken px-4 py-3 font-semibold text-gray-700 ring-ring outline-none text-body-sm focus-visible:ring-2"
              >
                <span>이어서 만들기</span>
                <span className="text-gray-500 text-caption">
                  {continueTarget.label}
                </span>
              </Link>
            )}

            <button
              type="button"
              onClick={onCreate}
              aria-label="무드보드 만들기 — 추구미 테스트 시작하기"
              className="flex w-full items-center gap-4 rounded-[var(--radius-pill)] border border-gray-100 bg-surface-card py-4 pr-5 pl-7 shadow-card ring-ring transition-colors duration-200 ease-standard outline-none hover:bg-surface-sunken focus-visible:ring-2 active:bg-gray-100"
            >
              <span className="font-display-en text-[1.75rem] leading-none text-foreground">
                Create
              </span>
              {/* 손으로 그린 듯 긴 화살표 라인(디자인 시안) */}
              <span
                aria-hidden="true"
                className="flex flex-1 items-center gap-0"
              >
                <span className="h-px flex-1 bg-gray-900/70" />
                <ArrowRight
                  className="-ml-1 size-5 shrink-0 text-gray-900"
                  strokeWidth={1.5}
                />
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
