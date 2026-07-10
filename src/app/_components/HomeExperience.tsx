"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import FirstEntryLanding, {
  type ContinueTarget,
} from "@/app/_components/FirstEntryLanding";
import HistoryCarousel from "@/app/_components/HistoryCarousel";
import {
  BoardMark,
  ChugumiMark,
  ModeMark,
  VibeMark,
  VisionMark,
} from "@/app/_components/HistoryWordmark";
import { useBlockBackNavigation } from "@/app/_components/useBlockBackNavigation";
import ProfileMenu from "@/components/auth/ProfileMenu";
import { Button } from "@/components/ui/button";
import { getMoodboards } from "@/lib/api/get-moodboards";
import { ApiClientError } from "@/lib/api-client";
import { loadMoodTestDraft } from "@/lib/mood-test/draft-storage";
import type { MoodTestDraft } from "@/lib/mood-test/draft-storage";
import { loadEditProgress } from "@/lib/mood-test/edit-progress-storage";
import type { MoodboardSummary } from "@/lib/moodboard/summary";

type Props = {
  initialError: string | null;
  initialMoodboards: MoodboardSummary[];
  isLoggedIn: boolean;
};

function getErrorMessage(error: unknown) {
  if (error instanceof ApiClientError) {
    return error.message;
  }

  return "잠시 뒤 다시 시도해 주세요.";
}

function getDraftStepHref(draft: MoodTestDraft) {
  return `/test/${draft.sessionId}?step=${draft.stepIndex}`;
}

function MoodboardSkeletonGrid() {
  return (
    <section
      aria-label="저장한 무드보드 불러오는 중"
      aria-busy="true"
      className="grid grid-cols-2 gap-3 sm:grid-cols-3"
    >
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="overflow-hidden rounded-lg bg-card"
          role="status"
        >
          <div className="aspect-[3/4] animate-pulse bg-gray-100 motion-reduce:animate-none" />
          <div className="space-y-2 p-3">
            <div className="h-3 w-4/5 animate-pulse rounded-full bg-gray-100 motion-reduce:animate-none" />
            <div className="h-3 w-1/2 animate-pulse rounded-full bg-gray-100 motion-reduce:animate-none" />
          </div>
        </div>
      ))}
    </section>
  );
}

function RetryPanel({
  error,
  isRetrying,
  onRetry,
}: {
  error: string | null;
  isRetrying: boolean;
  onRetry: () => void;
}) {
  if (!error) return null;

  return (
    <section
      aria-live="polite"
      className="flex flex-col gap-1 rounded-lg p-4 text-foreground shadow-[inset_0_1px_4px_rgba(0,0,0,0.3)]"
    >
      <p className="text-md font-bold">저장한 보드를 불러오지 못했어요.</p>
      <p className="text-sm leading-6 text-gray-700">{error}</p>
      <Button
        tone="sand"
        size="md"
        type="button"
        onClick={onRetry}
        disabled={isRetrying}
        className="mt-3 ml-auto"
      >
        {isRetrying ? "다시 불러오는 중" : "다시 시도"}
      </Button>
    </section>
  );
}

function ContinueDraftEntry({ target }: { target: ContinueTarget | null }) {
  if (!target) return null;

  return (
    <Link
      href={target.href}
      className="flex items-center justify-between rounded-full border bg-secondary px-4 py-3.5 text-sm font-bold text-gray-700 ring-ring outline-none focus-visible:ring-2"
    >
      <span>이어서 만들기</span>
      <span className="text-xs font-bold">{target.label}</span>
    </Link>
  );
}

// 목록은 서버 렌더에서 이미 왔다 — 스켈레톤이 뜨는 건 재시도 중일 때뿐이다 (#132).
function HistoryContent({
  errorPanel,
  hasError,
  isRetrying,
  moodboards,
}: {
  errorPanel: React.ReactNode;
  hasError: boolean;
  isRetrying: boolean;
  moodboards: MoodboardSummary[];
}) {
  return (
    <main className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden pb-3">
      <div className="mx-auto w-full max-w-[680px] space-y-3 px-4">
        <h1 lang="en" className="">
          <span className="sr-only">Vision Mode Vibe Chugumi Board</span>
        </h1>
        <p className="mt-2 font-semibold text-gray-500 text-label">
          {isRetrying
            ? "저장한 무드보드를 불러오고 있어요"
            : hasError
              ? "저장한 무드보드를 확인하지 못했어요"
              : `${moodboards.length}개의 무드보드를 모았어요`}
        </p>
        {errorPanel}
      </div>
      {isRetrying ? (
        <div className="mx-auto w-full max-w-[680px]">
          <MoodboardSkeletonGrid />
        </div>
      ) : moodboards.length > 0 ? (
        <HistoryCarousel moodboards={moodboards} />
      ) : null}
    </main>
  );
}

export default function HomeExperience({
  initialError,
  initialMoodboards,
  isLoggedIn,
}: Props) {
  const router = useRouter();

  // 홈에서는 브라우저 뒤로가기를 가로채 아무 동작도 하지 않게 한다 (앱 밖으로 이탈 방지).
  useBlockBackNavigation();

  const [moodboards, setMoodboards] = useState(initialMoodboards);
  const [error, setError] = useState(initialError);
  const [isRetrying, setIsRetrying] = useState(false);
  const [continueTarget, setContinueTarget] = useState<ContinueTarget | null>(
    null,
  );

  useEffect(() => {
    let isActive = true;

    Promise.resolve().then(() => {
      if (!isActive) return;

      // 이어서 만들기의 재료는 둘이다: 진행 중인 질문 드래프트(draft-storage)와, 생성이
      // 끝나 편집까지 온 세션(edit-progress-storage). 둘 다 있을 수 있으므로 더 최근에
      // 손댄 지점 하나만 노출한다.
      const candidates: ContinueTarget[] = [];

      // 질문 세트가 바뀌었거나 손상된 드래프트(status: "stale")는 이어갈 수 없다 —
      // 후보에서 아예 뺀다. 사연은 굳이 알리지 않는다 (#121).
      const stored = loadMoodTestDraft();
      if (stored.status === "ok") {
        candidates.push({
          href: getDraftStepHref(stored.draft),
          label: `${stored.draft.stepIndex + 1}단계`,
          updatedAt: stored.draft.updatedAt,
        });
      }

      // 편집 단계에서 나간 세션 — /test/{sessionId}/edit 로 되돌아가면 서버의 완료된 job
      // 으로 편집을 그대로 이어간다 (job 이 아직이면 edit 페이지가 생성중으로 되돌린다).
      const editStored = loadEditProgress();
      if (editStored.status === "ok") {
        candidates.push({
          href: `/test/${editStored.progress.sessionId}/edit`,
          label: "편집 단계",
          updatedAt: editStored.progress.updatedAt,
        });
      }

      // updatedAt 은 ISO 문자열이라 사전순 = 시간순이다.
      const newest = candidates.sort((a, b) =>
        b.updatedAt.localeCompare(a.updatedAt),
      )[0];
      setContinueTarget(newest ?? null);
    });

    return () => {
      isActive = false;
    };
  }, []);

  const handleCreateMoodboard = useCallback(() => {
    router.push(`/test/${crypto.randomUUID()}`);
  }, [router]);

  const handleRetry = useCallback(() => {
    setIsRetrying(true);
    getMoodboards()
      .then((items) => {
        setMoodboards(items);
        setError(null);
      })
      .catch((retryError: unknown) => {
        setError(getErrorMessage(retryError));
      })
      .finally(() => setIsRetrying(false));
  }, []);

  const errorPanel = useMemo(
    () => (
      <RetryPanel error={error} isRetrying={isRetrying} onRetry={handleRetry} />
    ),
    [error, handleRetry, isRetrying],
  );
  const hasMoodboards = moodboards.length > 0;
  const hasError = error !== null;

  // 보드 유무는 서버가 이미 판정했다 — 회원은 인증 쿠키로, 게스트는 게스트 쿠키로
  // 조회한 결과가 initialMoodboards 로 온다 (#126 이후). 마운트 뒤 목록을 다시 부르면
  // 그 로딩 상태가 "보드 있음" 으로 새어 들어가 0개인 사용자에게도 History 셸이
  // 한 번 번쩍인다 (#132). 조회는 서버 렌더 한 번뿐이고, 재시도만 클라이언트가 맡는다.
  const shouldShowHistory = hasMoodboards || hasError;

  // 저장 보드 0개 → 메인(첫진입): 스플래시 → 첫진입 애니메이션 화면. 자체 크롬(아바타·CTA)을
  // 가지므로 공용 헤더/푸터로 감싸지 않는다. History 상태만 공용 셸을 쓴다.
  if (!shouldShowHistory) {
    return (
      <FirstEntryLanding
        isLoggedIn={isLoggedIn}
        continueTarget={continueTarget}
        onCreate={handleCreateMoodboard}
      />
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background text-foreground">
      <header className="mx-auto flex w-full max-w-[720px] items-start justify-between px-4 py-3">
        <Link
          href="/"
          className="flex flex-col items-start pt-2 text-foreground"
        >
          <VisionMark className="mb-3 h-[26px] w-auto" />
          <ModeMark className="mb-3 h-[27px] w-auto" />
          <VibeMark className="mb-3 h-[27px] w-auto" />
          <span className="flex items-center gap-2">
            <ChugumiMark className="h-[34px] w-auto" />
            <BoardMark className="-mt-3 h-[27px] w-auto" />
          </span>
        </Link>
        <span />
        <ProfileMenu isLoggedIn={isLoggedIn} />
      </header>

      <HistoryContent
        errorPanel={errorPanel}
        hasError={hasError}
        isRetrying={isRetrying}
        moodboards={moodboards}
      />

      <footer className="mx-auto w-full max-w-[720px] space-y-2 border-t border-gray-100 bg-background px-4 py-3">
        <ContinueDraftEntry target={continueTarget} />
        <Button
          type="button"
          tone="ink"
          size="md"
          onClick={handleCreateMoodboard}
          className="h-[52px] w-full text-base font-bold"
        >
          무드보드 만들기
        </Button>
      </footer>
    </div>
  );
}
