"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import FirstEntryLanding, {
  type ContinueTarget,
} from "@/app/_components/FirstEntryLanding";
import HistoryCarousel from "@/app/_components/HistoryCarousel";
import ProfileMenu from "@/components/auth/ProfileMenu";
import { listMoodboardDrafts } from "@/components/board/moodboard-draft-storage";
import { Button } from "@/components/ui/button";
import { getMoodboards } from "@/lib/api/get-moodboards";
import { ApiClientError } from "@/lib/api-client";
import { getStoredGuestSessionId } from "@/lib/auth/guest-session";
import { loadMoodTestDraft } from "@/lib/mood-test/draft-storage";
import type { MoodTestDraft } from "@/lib/mood-test/draft-storage";
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
      className="rounded-lg border border-[#f1b2a7] bg-[#fff0ed] p-4 text-foreground"
    >
      <p className="text-sm font-bold">저장한 보드를 불러오지 못했어요.</p>
      <p className="mt-1 text-sm leading-6 text-gray-700">{error}</p>
      <button
        type="button"
        onClick={onRetry}
        disabled={isRetrying}
        className="mt-3 min-h-11 rounded-full bg-surface-inverse px-4 py-2 text-sm font-bold text-white disabled:opacity-55"
      >
        {isRetrying ? "다시 불러오는 중" : "다시 시도"}
      </button>
    </section>
  );
}

function ContinueDraftEntry({ target }: { target: ContinueTarget | null }) {
  if (!target) return null;

  return (
    <Link
      href={target.href}
      className="flex items-center justify-between rounded-lg border border-[#2556d9]/35 bg-[#eef3ff] px-4 py-3 text-sm font-bold text-[#163b98] ring-ring outline-none focus-visible:ring-2"
    >
      <span>이어서 만들기</span>
      <span className="text-xs font-bold">{target.label}</span>
    </Link>
  );
}

function HistoryContent({
  errorPanel,
  hasError,
  isLoading,
  moodboards,
}: {
  errorPanel: React.ReactNode;
  hasError: boolean;
  isLoading: boolean;
  moodboards: MoodboardSummary[];
}) {
  return (
    <main className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden px-4 pt-2 pb-3">
      <div className="mx-auto w-full max-w-[680px] space-y-3">
        <div>
          <h1 className="text-4xl leading-tight font-bold text-foreground">
            History
          </h1>
          <p className="mt-2 text-base font-bold text-gray-700">
            {isLoading
              ? "저장한 무드보드를 불러오고 있어요"
              : hasError
                ? "저장한 무드보드를 확인하지 못했어요"
                : `${moodboards.length}개의 무드보드를 모았어요`}
          </p>
        </div>
        {errorPanel}
      </div>
      {isLoading ? (
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
  const [moodboards, setMoodboards] = useState(initialMoodboards);
  const [error, setError] = useState(initialError);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [continueTarget, setContinueTarget] = useState<ContinueTarget | null>(
    null,
  );

  useEffect(() => {
    let isActive = true;
    const guestSessionId = isLoggedIn ? null : getStoredGuestSessionId();
    const testDraft = loadMoodTestDraft();
    const testTarget = testDraft
      ? {
          href: getDraftStepHref(testDraft),
          label: `${testDraft.stepIndex + 1}단계`,
          updatedAt: testDraft.updatedAt,
        }
      : null;

    listMoodboardDrafts()
      .then((drafts) => {
        if (!isActive) return;

        const editTarget = [...drafts].sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        )[0];
        const candidates = [
          testTarget,
          editTarget
            ? {
                href: `/moodboard/${editTarget.moodboardId}/edit`,
                label: "편집 중",
                updatedAt: editTarget.updatedAt,
              }
            : null,
        ].filter((target): target is ContinueTarget => target !== null);

        setContinueTarget(
          [...candidates].sort(
            (a, b) =>
              new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
          )[0] ?? null,
        );
      })
      .catch(() => {
        if (isActive) setContinueTarget(testTarget);
      });

    if (!isLoggedIn && guestSessionId) {
      Promise.resolve()
        .then(() => {
          if (isActive) setIsLoadingList(true);
          return getMoodboards({ guestSessionId });
        })
        .then((items) => {
          if (!isActive) return;
          setMoodboards(items);
          setError(null);
        })
        .catch((listError: unknown) => {
          if (isActive) setError(getErrorMessage(listError));
        })
        .finally(() => {
          if (isActive) setIsLoadingList(false);
        });
    }

    return () => {
      isActive = false;
    };
  }, [isLoggedIn]);

  const handleCreateMoodboard = useCallback(() => {
    router.push(`/test/${crypto.randomUUID()}`);
  }, [router]);

  const handleRetry = useCallback(() => {
    setIsLoadingList(true);
    getMoodboards({ guestSessionId: getStoredGuestSessionId() })
      .then((items) => {
        setMoodboards(items);
        setError(null);
      })
      .catch((retryError: unknown) => {
        setError(getErrorMessage(retryError));
      })
      .finally(() => setIsLoadingList(false));
  }, []);

  const errorPanel = useMemo(
    () => (
      <RetryPanel
        error={error}
        isRetrying={isLoadingList}
        onRetry={handleRetry}
      />
    ),
    [error, handleRetry, isLoadingList],
  );
  const hasMoodboards = moodboards.length > 0;
  const hasError = error !== null;
  const shouldShowHistory = hasMoodboards || isLoadingList || hasError;

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
      <header className="mx-auto flex w-full max-w-[720px] items-center justify-between px-4 py-3">
        <Link href="/" className="text-sm font-bold tracking-normal">
          mood·me
        </Link>
        <ProfileMenu isLoggedIn={isLoggedIn} />
      </header>

      <HistoryContent
        errorPanel={errorPanel}
        hasError={hasError}
        isLoading={isLoadingList}
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
