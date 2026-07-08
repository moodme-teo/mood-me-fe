"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import ProfileMenu from "@/components/auth/ProfileMenu";
import { listMoodboardDrafts } from "@/components/board/moodboard-draft-storage";
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

type ExampleMoodboard = {
  alt: string;
  imageUrl: string;
  title: string;
};

type ContinueTarget = {
  href: string;
  label: string;
  updatedAt: string;
};

const EXAMPLE_MOODBOARDS: ExampleMoodboard[] = [
  {
    imageUrl: "/test-image/board/b21.jpg",
    title: "부드러운 활기",
    alt: "초록과 햇빛 톤의 큐레이션 무드보드 예시",
  },
  {
    imageUrl: "/test-image/board/b45.jpg",
    title: "작은 확신",
    alt: "푸른 오브제와 텍스처가 섞인 큐레이션 무드보드 예시",
  },
  {
    imageUrl: "/test-image/board/b76.jpg",
    title: "나만의 속도",
    alt: "따뜻한 빛과 빈티지 장면이 놓인 큐레이션 무드보드 예시",
  },
];

function getErrorMessage(error: unknown) {
  if (error instanceof ApiClientError) {
    return error.message;
  }

  return "잠시 뒤 다시 시도해 주세요.";
}

function getDraftStepHref(draft: MoodTestDraft) {
  return `/test/${draft.sessionId}?step=${draft.stepIndex}`;
}

function ExampleGrid() {
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  return (
    <section aria-label="무드보드 예시" className="grid grid-cols-3 gap-2">
      {EXAMPLE_MOODBOARDS.map((example, index) => {
        const hasFailed = failedImages.has(example.imageUrl);

        return (
          <article
            key={example.imageUrl}
            className={`relative overflow-hidden rounded-lg bg-neutral-200 ${
              index === 1 ? "mt-7" : ""
            }`}
          >
            <div className="relative aspect-[3/4]">
              {hasFailed ? (
                <div className="flex h-full items-end bg-[#dfe8dd] p-2 text-xs font-black text-neutral-950">
                  {example.title}
                </div>
              ) : (
                <Image
                  fill
                  src={example.imageUrl}
                  alt={example.alt}
                  sizes="(max-width: 768px) 32vw, 160px"
                  className="object-cover"
                  onError={() => {
                    setFailedImages((current) => {
                      const next = new Set(current);
                      next.add(example.imageUrl);
                      return next;
                    });
                  }}
                />
              )}
            </div>
            <div className="absolute inset-x-0 bottom-0 bg-neutral-950/82 px-2 py-2 text-[11px] font-black text-white">
              {example.title}
            </div>
          </article>
        );
      })}
    </section>
  );
}

function MoodboardCard({ moodboard }: { moodboard: MoodboardSummary }) {
  const [hasImageFailed, setHasImageFailed] = useState(false);
  const cardTitle =
    moodboard.title === moodboard.typeName
      ? moodboard.typeName
      : `${moodboard.typeName} · ${moodboard.title}`;

  return (
    <Link
      href={`/moodboard/${moodboard.id}`}
      aria-label={`${cardTitle} 결과 열람하기`}
      className="group block overflow-hidden rounded-lg bg-white text-neutral-950 ring-[#2556d9] transition outline-none focus-visible:ring-2"
    >
      <div className="relative aspect-[3/4] bg-[#dfe8dd]">
        {hasImageFailed ? (
          <div className="flex h-full items-end p-3 text-sm font-black">
            {moodboard.typeName}
          </div>
        ) : (
          <Image
            fill
            unoptimized
            src={moodboard.thumbnailUrl}
            alt={`${moodboard.typeName} 무드보드 썸네일`}
            sizes="(max-width: 768px) 50vw, 220px"
            className="object-cover transition duration-300 group-hover:scale-[1.03]"
            onError={() => setHasImageFailed(true)}
          />
        )}
        {moodboard.isGuest ? (
          <span className="absolute top-2 left-2 rounded-full bg-neutral-950/82 px-2 py-1 text-[11px] font-black text-white">
            임시
          </span>
        ) : null}
      </div>
      <div className="min-h-16 p-3">
        <p className="line-clamp-2 text-sm font-black">{moodboard.typeName}</p>
        {moodboard.title !== moodboard.typeName ? (
          <p className="mt-1 line-clamp-1 text-xs font-bold text-neutral-600">
            {moodboard.title}
          </p>
        ) : null}
      </div>
    </Link>
  );
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
          className="overflow-hidden rounded-lg bg-white"
          role="status"
        >
          <div className="aspect-[3/4] animate-pulse bg-neutral-200 motion-reduce:animate-none" />
          <div className="space-y-2 p-3">
            <div className="h-3 w-4/5 animate-pulse rounded-full bg-neutral-200 motion-reduce:animate-none" />
            <div className="h-3 w-1/2 animate-pulse rounded-full bg-neutral-200 motion-reduce:animate-none" />
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
      className="rounded-lg border border-[#f1b2a7] bg-[#fff0ed] p-4 text-neutral-950"
    >
      <p className="text-sm font-black">저장한 보드를 불러오지 못했어요.</p>
      <p className="mt-1 text-sm leading-6 text-neutral-700">{error}</p>
      <button
        type="button"
        onClick={onRetry}
        disabled={isRetrying}
        className="mt-3 min-h-11 rounded-full bg-neutral-950 px-4 py-2 text-sm font-black text-white disabled:opacity-55"
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
      className="flex items-center justify-between rounded-lg border border-[#2556d9]/35 bg-[#eef3ff] px-4 py-3 text-sm font-black text-[#163b98] ring-[#2556d9] outline-none focus-visible:ring-2"
    >
      <span>이어서 만들기</span>
      <span className="text-xs font-bold">{target.label}</span>
    </Link>
  );
}

function LandingContent({ errorPanel }: { errorPanel: React.ReactNode }) {
  return (
    <main className="flex min-h-0 flex-1 flex-col gap-8 overflow-y-auto px-4 pt-2 pb-5">
      <section className="mx-auto w-full max-w-[520px] space-y-6">
        <div className="space-y-4">
          <h1 className="text-[clamp(2.65rem,11vw,4.7rem)] leading-[0.96] font-black text-balance text-neutral-950">
            <span className="block">오늘의 추구미를</span>
            <span className="block">보드로 채워요</span>
          </h1>
          <p className="max-w-[34ch] text-base leading-7 font-semibold text-pretty text-neutral-700">
            짧게 고른 취향 답변이 AI 이미지와 키워드가 되고, 마지막에는 바로
            공유하고 싶은 나만의 무드보드가 됩니다.
          </p>
        </div>

        <ExampleGrid />
        {errorPanel}
      </section>
    </main>
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
    <main className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 pt-2 pb-5">
      <section className="mx-auto w-full max-w-[680px] space-y-5">
        <div>
          <h1 className="text-4xl leading-tight font-black text-neutral-950">
            History
          </h1>
          <p className="mt-2 text-base font-bold text-neutral-700">
            {isLoading
              ? "저장한 무드보드를 불러오고 있어요"
              : hasError
                ? "저장한 무드보드를 확인하지 못했어요"
                : `${moodboards.length}개의 무드보드를 모았어요`}
          </p>
        </div>
        {errorPanel}
        {isLoading ? (
          <MoodboardSkeletonGrid />
        ) : (
          <section
            aria-label="저장한 무드보드"
            className="grid grid-cols-2 gap-3 sm:grid-cols-3"
          >
            {moodboards.map((moodboard) => (
              <MoodboardCard key={moodboard.id} moodboard={moodboard} />
            ))}
          </section>
        )}
      </section>
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

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[#f7f7f8] text-neutral-950">
      <header className="mx-auto flex w-full max-w-[720px] items-center justify-between px-4 py-3">
        <Link href="/" className="text-sm font-black tracking-normal">
          mood·me
        </Link>
        <ProfileMenu isLoggedIn={isLoggedIn} />
      </header>

      {shouldShowHistory ? (
        <HistoryContent
          errorPanel={errorPanel}
          hasError={hasError}
          isLoading={isLoadingList}
          moodboards={moodboards}
        />
      ) : (
        <LandingContent errorPanel={errorPanel} />
      )}

      <footer className="mx-auto w-full max-w-[720px] space-y-2 border-t border-neutral-200 bg-[#f7f7f8] px-4 py-3">
        <ContinueDraftEntry target={continueTarget} />
        <button
          type="button"
          onClick={handleCreateMoodboard}
          className="h-[52px] w-full rounded-full bg-neutral-950 px-5 text-base font-black text-white ring-[#2556d9] transition outline-none focus-visible:ring-2 active:scale-[0.99]"
        >
          무드보드 만들기
        </button>
      </footer>
    </div>
  );
}
