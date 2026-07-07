"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { BoardCanvas } from "@/components/canvas";
import { getMoodboard } from "@/lib/api/get-moodboard";
import { ApiClientError } from "@/lib/api-client";
import type { Moodboard, MoodVector } from "@/types/moodboard";
import { MOODBOARD_HEIGHT, MOODBOARD_WIDTH } from "@/types/moodboard";

type Props = {
  moodboardId: string;
};

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; moodboard: Moodboard };

const MOOD_AXES: {
  key: keyof MoodVector;
  left: string;
  right: string;
}[] = [
  { key: "calm_energy", left: "고요", right: "활기" },
  { key: "warm_cool", left: "따뜻", right: "서늘" },
  { key: "minimal_maximal", left: "미니멀", right: "맥시멀" },
  { key: "vintage_modern", left: "빈티지", right: "모던" },
  { key: "real_dreamy", left: "현실", right: "몽환" },
];

function Toast({ message }: { message: string | null }) {
  if (!message) return null;

  return (
    <div
      role="status"
      className="fixed left-1/2 top-4 z-40 w-[calc(100%-32px)] max-w-sm -translate-x-1/2 rounded-xl bg-neutral-950 px-4 py-3 text-sm font-bold text-white"
    >
      {message}
    </div>
  );
}

function LoadingView() {
  return (
    <main className="flex flex-1 justify-center overflow-y-auto bg-[#f7f7f8] px-4 py-5 text-neutral-950">
      <div className="w-full max-w-[430px] animate-pulse space-y-4">
        <div className="h-12 rounded-2xl bg-neutral-200" />
        <div className="mx-auto h-[520px] w-full max-w-[360px] rounded-2xl bg-neutral-200" />
        <div className="h-28 rounded-2xl bg-neutral-200" />
        <div className="h-44 rounded-2xl bg-neutral-200" />
      </div>
    </main>
  );
}

function ErrorView({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <main className="flex flex-1 items-center justify-center bg-[#f7f7f8] px-4 text-neutral-950">
      <section className="w-full max-w-sm rounded-2xl bg-white p-5 text-center">
        <h1 className="text-xl font-black">결과를 불러오지 못했어요.</h1>
        <p className="mt-3 text-sm leading-6 text-neutral-700">{message}</p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <Link
            href="/"
            className="rounded-xl border border-neutral-300 px-4 py-3 text-sm font-bold"
          >
            홈으로
          </Link>
          <button
            type="button"
            onClick={onRetry}
            className="rounded-xl bg-neutral-950 px-4 py-3 text-sm font-bold text-white"
          >
            다시 시도
          </button>
        </div>
      </section>
    </main>
  );
}

function MoodSpectrum({ vector }: { vector: MoodVector }) {
  return (
    <section className="rounded-2xl bg-white p-4">
      <h2 className="text-lg font-black">무드 성향 5축</h2>
      <div className="mt-4 space-y-4">
        {MOOD_AXES.map((axis) => {
          const value = vector[axis.key];
          const percent = Math.round(value * 100);

          return (
            <div key={axis.key}>
              <div className="flex items-center justify-between text-xs font-bold text-neutral-700">
                <span>{axis.left}</span>
                <span>{axis.right}</span>
              </div>
              <div className="mt-2 h-3 rounded-full bg-neutral-200">
                <div
                  className="h-3 rounded-full bg-[#2556d9]"
                  style={{ width: `${percent}%` }}
                />
              </div>
              <p className="mt-1 text-right text-xs font-bold text-neutral-500">
                {percent}%
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ReadingBlock({ moodboard }: { moodboard: Moodboard }) {
  const { moodProfile } = moodboard;

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-4xl font-black leading-tight text-neutral-950">
          {moodProfile.title}
        </h1>
        <p className="mt-2 text-base font-bold text-[#2556d9]">
          {moodProfile.type_name}
        </p>
      </div>
      <div className="space-y-3 rounded-2xl bg-white p-4 text-[15px] font-medium leading-7 text-neutral-800">
        <p>{moodProfile.reading.conviction}</p>
        <p>{moodProfile.reading.desire}</p>
        <p>{moodProfile.reading.showdown}</p>
      </div>
    </section>
  );
}

function KeywordCloud({ moodboard }: { moodboard: Moodboard }) {
  const { keywords, sticker_phrases: stickerPhrases } = moodboard.moodProfile;

  if (keywords.length === 0 && stickerPhrases.length === 0) return null;

  return (
    <section className="space-y-3">
      {keywords.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {keywords.map((keyword) => (
            <span
              key={keyword}
              className="rounded-full bg-white px-3 py-2 text-xs font-bold text-neutral-800"
            >
              {keyword}
            </span>
          ))}
        </div>
      ) : null}
      {stickerPhrases.length > 0 ? (
        <div className="grid gap-2 sm:grid-cols-3">
          {stickerPhrases.map((phrase) => (
            <p
              key={phrase}
              className="rounded-2xl bg-neutral-950 px-4 py-3 text-center text-sm font-black text-white"
            >
              {phrase}
            </p>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function GuestBanner() {
  return (
    <section className="rounded-2xl bg-[#e8eeff] p-4 text-neutral-950">
      <p className="text-sm font-black">로그인하면 언제든 다시 볼 수 있어요.</p>
      <p className="mt-1 text-sm leading-6 text-neutral-700">
        지금은 게스트로도 열람, 공유, 이미지 내보내기를 모두 사용할 수 있습니다.
      </p>
      <Link
        href="/login"
        className="mt-3 inline-flex rounded-xl bg-neutral-950 px-4 py-3 text-sm font-bold text-white"
      >
        로그인하고 보관하기
      </Link>
    </section>
  );
}

function ResultActions({
  moodboard,
  onDownload,
  onShare,
}: {
  moodboard: Moodboard;
  onDownload: () => void;
  onShare: () => void;
}) {
  const router = useRouter();

  return (
    <section className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onShare}
          className="rounded-xl bg-[#2556d9] px-4 py-3 text-sm font-black text-white"
        >
          SNS 공유
        </button>
        <button
          type="button"
          onClick={onDownload}
          className="rounded-xl bg-neutral-950 px-4 py-3 text-sm font-black text-white"
        >
          이미지 내보내기
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Link
          href={`/moodboard/${moodboard.id}/edit`}
          className="rounded-xl border border-neutral-300 bg-white px-3 py-3 text-center text-xs font-bold text-neutral-900"
        >
          편집
        </Link>
        <button
          type="button"
          onClick={() => {
            if (window.confirm("처음부터 다시 만들까요?")) {
              router.push(`/test/${crypto.randomUUID()}`);
            }
          }}
          className="rounded-xl border border-neutral-300 bg-white px-3 py-3 text-xs font-bold text-neutral-900"
        >
          다시 만들기
        </button>
        <Link
          href="/"
          className="rounded-xl border border-neutral-300 bg-white px-3 py-3 text-center text-xs font-bold text-neutral-900"
        >
          홈
        </Link>
      </div>
    </section>
  );
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return;
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();

    document.execCommand("copy");
    document.body.removeChild(textarea);
  }
}

export default function MoodboardResult({ moodboardId }: Props) {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [toast, setToast] = useState<string | null>(null);
  const exportRef = useRef<(() => string | null) | null>(null);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2600);
  }, []);

  const handleLoadError = useCallback((error: unknown) => {
    const message =
      error instanceof ApiClientError
        ? error.message
        : "잠시 뒤 다시 시도해 주세요.";
    setState({ status: "error", message });
  }, []);

  const reloadMoodboard = useCallback(() => {
    setState({ status: "loading" });
    getMoodboard(moodboardId)
      .then((moodboard) => setState({ status: "ready", moodboard }))
      .catch(handleLoadError);
  }, [handleLoadError, moodboardId]);

  useEffect(() => {
    let isActive = true;

    getMoodboard(moodboardId)
      .then((moodboard) => {
        if (isActive) setState({ status: "ready", moodboard });
      })
      .catch((error: unknown) => {
        if (isActive) handleLoadError(error);
      });

    return () => {
      isActive = false;
    };
  }, [handleLoadError, moodboardId]);

  const handleDownload = useCallback(() => {
    try {
      const dataUrl = exportRef.current?.();
      if (!dataUrl) {
        showToast("이미지 준비가 아직 끝나지 않았어요.");
        return;
      }

      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `mood-me-${moodboardId}.png`;
      link.click();
      showToast("PNG 이미지를 저장했어요.");
    } catch (error) {
      console.error(error);
      showToast("이미지 내보내기에 실패했어요.");
    }
  }, [moodboardId, showToast]);

  const handleShare = useCallback(async () => {
    const url = window.location.href;

    try {
      await copyText(url);
      showToast("링크를 복사했어요.");
    } catch (error) {
      console.error(error);
      showToast("링크 복사에 실패했어요.");
    }
  }, [showToast]);

  if (state.status === "loading") return <LoadingView />;
  if (state.status === "error") {
    return <ErrorView message={state.message} onRetry={reloadMoodboard} />;
  }

  const { moodboard } = state;

  return (
    <main className="flex flex-1 justify-center overflow-y-auto bg-[#f7f7f8] text-neutral-950">
      <Toast message={toast} />
      <div className="w-full max-w-[430px] px-4 py-4">
        <header className="mb-4 flex items-center justify-between">
          <Link
            href="/"
            className="rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm font-bold"
          >
            홈
          </Link>
          <p className="text-sm font-black">mood·me</p>
        </header>

        <section className="mx-auto w-[360px] max-w-full overflow-hidden rounded-2xl bg-neutral-950">
          <BoardCanvas
            width={MOODBOARD_WIDTH}
            height={MOODBOARD_HEIGHT}
            baseImageUrl={moodboard.baseImageUrl}
            elements={moodboard.elements}
            onExportReady={(exportImage) => {
              exportRef.current = exportImage;
            }}
            onImageError={() => showToast("이미지를 불러오지 못했어요.")}
          />
        </section>

        <div className="mt-6 space-y-6 pb-8">
          <ReadingBlock moodboard={moodboard} />
          <MoodSpectrum vector={moodboard.moodProfile.mood_vector} />
          <KeywordCloud moodboard={moodboard} />
          <ResultActions
            moodboard={moodboard}
            onDownload={handleDownload}
            onShare={handleShare}
          />
          {moodboard.isGuest ? <GuestBanner /> : null}
        </div>
      </div>
    </main>
  );
}
