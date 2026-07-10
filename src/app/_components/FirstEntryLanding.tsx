"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import BoardCardStack from "@/app/_components/first-entry/BoardCardStack";
import SplashScene from "@/app/_components/first-entry/SplashScene";
import ProfileMenu from "@/components/auth/ProfileMenu";

// 첫진입(메인) 화면 — 저장 보드가 0개일 때의 얼굴. 스플래시가 화면 이동 없이 애니메이션으로
// 첫진입 화면으로 이어지고(디자인 시안), 상단에서 이미지 카드가 떨어져 흩뿌려진 배치로
// 자리잡는다. 카드 무리는 세로 스와이프/스크롤 가능.
// 스플래시는 세션당 1회만 재생(sessionStorage) — 반복 진입 마찰 제거.
// 종료 조건은 아래 SPLASH_MIN_MS / SPLASH_MAX_MS 주석 참고.

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

// 스플래시는 "최소 시간" 과 "카드 이미지 준비" 를 모두 만족해야 끝난다.
// - 최소 2.6초: 서브카피(가치 제안)를 읽을 시간. 캐시된 재방문자가 순식간에 지나치지 않게 한다.
// - 이미지 준비: 빈 회색 카드가 떨어지고 나서 사진이 뒤늦게 채워지는 걸 막는다.
// - 상한 5초: 네트워크가 느리거나 죽어도 첫진입 화면까지는 반드시 간다.
//
// 두 시간 모두 "스플래시가 화면에 뜬 순간" 부터 잰다. 이펙트가 도는 하이드레이션 시점부터 재면
// 느린 기기에서 스플래시가 (하이드레이션 + 2.6초) 만큼 길어진다 — 사용자는 이미 보고 있는데.
const SPLASH_MIN_MS = 2600;
const SPLASH_MAX_MS = 5000;

// 등장 전용 감속 곡선(ease-out-quint) — SplashScene 과 같은 값을 쓴다.
const EASE_IN = [0.22, 1, 0.36, 1] as const;

// 스플래시는 서버가 그린 첫 화면이라 first-contentful-paint 가 곧 스플래시가 뜬 시각이다.
// 페인트 타이밍이 없거나(구형 브라우저) 클라이언트 라우팅으로 들어온 경우엔 지금을 기준으로 삼는다.
function elapsedSinceSplashShown() {
  const paints = performance.getEntriesByType("paint");
  const firstPaint = paints.find(
    (entry) => entry.name === "first-contentful-paint",
  );
  return firstPaint ? performance.now() - firstPaint.startTime : 0;
}

export default function FirstEntryLanding({
  isLoggedIn,
  continueTarget,
  onCreate,
}: Props) {
  const [minElapsed, setMinElapsed] = useState(false);
  const [imagesReady, setImagesReady] = useState(false);
  // 화면 탭 또는 상한 타이머로 두 조건을 건너뛴 경우.
  const [forcedEntry, setForcedEntry] = useState(false);

  // 페이즈는 저장하지 않고 조건에서 파생시킨다 — 이펙트 안에서 setState 하지 않아도 된다.
  const isEntry = forcedEntry || (minElapsed && imagesReady);
  const phase: Phase = isEntry ? "entry" : "splash";

  const skipToEntry = useCallback(() => setForcedEntry(true), []);
  const handleImagesReady = useCallback(() => setImagesReady(true), []);

  useEffect(() => {
    let alreadySeen = false;
    try {
      alreadySeen = sessionStorage.getItem(SPLASH_SEEN_KEY) === "1";
    } catch {
      alreadySeen = false;
    }

    // 이미 본 세션이면 최소 시간을 두지 않는다 — 이미지가 캐시에서 바로 올라오므로 곧장 넘어간다.
    const shown = elapsedSinceSplashShown();
    const remaining = (budget: number) => Math.max(0, budget - shown);

    const minTimer = window.setTimeout(
      () => setMinElapsed(true),
      alreadySeen ? 0 : remaining(SPLASH_MIN_MS),
    );
    const maxTimer = window.setTimeout(skipToEntry, remaining(SPLASH_MAX_MS));

    return () => {
      window.clearTimeout(minTimer);
      window.clearTimeout(maxTimer);
    };
  }, [skipToEntry]);

  useEffect(() => {
    if (!isEntry) return;
    try {
      sessionStorage.setItem(SPLASH_SEEN_KEY, "1");
    } catch {
      // sessionStorage 접근 불가(프라이빗 모드 등) — 스플래시만 매번 재생될 뿐 기능엔 영향 없음
    }
  }, [isEntry]);

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-surface-page">
      {/* 화면 전체가 배경 위로 떠오른다. 이게 없으면 Board 워드마크와 아바타가 첫 페인트에
          불투명하게 박힌 채로 나타나, 스플래시를 건너뛰는 재진입에서 특히 갑작스럽다.
          배경(bg-surface-page)은 바깥 div 에 남긴다 — 여기까지 함께 흐려지면 <html> 의
          어두운 배경이 비친다.
          framer 가 아니라 CSS 애니메이션인 이유: framer 의 initial 은 SSR 에도 opacity:0 으로
          찍혀, 하이드레이션이 끝날 때까지 빈 화면이 된다. CSS 는 첫 페인트부터 바로 돈다. */}
      <div className="absolute inset-0 animate-in duration-500 ease-out fade-in motion-reduce:animate-none">
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

        <BoardCardStack active={isEntry} onAboveFoldReady={handleImagesReady} />
        <SplashScene phase={phase} />

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
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: EASE_IN, delay: 0.35 }}
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
    </div>
  );
}
