"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { BoardPreview, compositeOnWhite } from "@/components/canvas";
import type { GetMoodboardResponse } from "@/lib/api/get-moodboard";
import { getMoodboard } from "@/lib/api/get-moodboard";
import { ApiClientError } from "@/lib/api-client";
import type { MoodVector } from "@/types/moodboard";
import { MOODBOARD_HEIGHT, MOODBOARD_WIDTH } from "@/types/moodboard";

type Props = {
  moodboardId: string;
};

// 서버가 대조해준 isOwner가 필요해 도메인 타입(Moodboard) 대신 API 응답 타입을 쓴다 (#126).
type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string; isMissing: boolean }
  | { status: "ready"; moodboard: GetMoodboardResponse };

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
      className="fixed top-4 left-1/2 z-40 w-[calc(100%-32px)] max-w-sm -translate-x-1/2 rounded-xl bg-surface-inverse px-4 py-3 text-sm font-bold text-white"
    >
      {message}
    </div>
  );
}

function LoadingView() {
  return (
    <main className="flex flex-1 justify-center overflow-y-auto bg-background px-4 py-5 text-foreground">
      <div className="w-full max-w-[430px] animate-pulse space-y-4">
        <div className="h-12 rounded-2xl bg-gray-100" />
        <div className="mx-auto h-[520px] w-full max-w-[360px] rounded-2xl bg-gray-100" />
        <div className="h-28 rounded-2xl bg-gray-100" />
        <div className="h-44 rounded-2xl bg-gray-100" />
      </div>
    </main>
  );
}

// 없는 보드 · 삭제된 보드 모두 같은 화면이다. 소유자가 아닌 사람에게 보드의 존재 여부를
// 흘리지 않으려고 서버도 같은 404로 답한다 (#126).
const MISSING_REDIRECT_MS = 2400;

function MissingView() {
  const router = useRouter();

  useEffect(() => {
    const timer = window.setTimeout(
      () => router.replace("/"),
      MISSING_REDIRECT_MS,
    );
    return () => window.clearTimeout(timer);
  }, [router]);

  return (
    <main className="flex flex-1 items-center justify-center bg-background px-4 text-foreground">
      <section className="w-full max-w-sm rounded-2xl bg-card p-5 text-center">
        <h1 className="text-xl font-bold">존재하지 않는 무드보드예요.</h1>
        <p className="mt-3 text-sm leading-6 text-gray-700">
          링크가 만료됐거나 삭제된 보드예요. 잠시 뒤 홈으로 이동할게요.
        </p>
        <Link
          href="/"
          className="mt-5 block rounded-xl bg-surface-inverse px-4 py-3 text-sm font-bold text-white"
        >
          지금 홈으로 가기
        </Link>
      </section>
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
    <main className="flex flex-1 items-center justify-center bg-background px-4 text-foreground">
      <section className="w-full max-w-sm rounded-2xl bg-card p-5 text-center">
        <h1 className="text-xl font-bold">결과를 불러오지 못했어요.</h1>
        <p className="mt-3 text-sm leading-6 text-gray-700">{message}</p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <Link
            href="/"
            className="rounded-xl border border-gray-300 px-4 py-3 text-sm font-bold"
          >
            홈으로
          </Link>
          <button
            type="button"
            onClick={onRetry}
            className="rounded-xl bg-surface-inverse px-4 py-3 text-sm font-bold text-white"
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
    <section className="rounded-2xl bg-card p-4">
      <h2 className="text-lg font-bold">무드 성향 5축</h2>
      <div className="mt-4 space-y-4">
        {MOOD_AXES.map((axis) => {
          const value = vector[axis.key];
          const percent = Math.round(value * 100);

          return (
            <div key={axis.key}>
              <div className="flex items-center justify-between text-xs font-bold text-gray-700">
                <span>{axis.left}</span>
                <span>{axis.right}</span>
              </div>
              <div className="mt-2 h-3 rounded-full bg-gray-100">
                <div
                  className="h-3 rounded-full bg-[#2556d9]"
                  style={{ width: `${percent}%` }}
                />
              </div>
              <p className="mt-1 text-right text-xs font-bold text-muted-foreground">
                {percent}%
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ReadingBlock({ moodboard }: { moodboard: GetMoodboardResponse }) {
  const { moodProfile } = moodboard;

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-4xl leading-tight font-bold text-foreground">
          {moodProfile.title}
        </h1>
        <p className="mt-2 text-base font-bold text-[#2556d9]">
          {moodProfile.type_name}
        </p>
      </div>
      <div className="space-y-3 rounded-2xl bg-card p-4 text-[15px] leading-7 font-medium text-gray-700">
        <p>{moodProfile.reading.conviction}</p>
        <p>{moodProfile.reading.desire}</p>
        <p>{moodProfile.reading.showdown}</p>
      </div>
    </section>
  );
}

function KeywordCloud({ moodboard }: { moodboard: GetMoodboardResponse }) {
  const { keywords, sticker_phrases: stickerPhrases } = moodboard.moodProfile;

  if (keywords.length === 0 && stickerPhrases.length === 0) return null;

  return (
    <section className="space-y-3">
      {keywords.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {keywords.map((keyword) => (
            <span
              key={keyword}
              className="rounded-full bg-card px-3 py-2 text-xs font-bold text-gray-700"
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
              className="rounded-2xl bg-surface-inverse px-4 py-3 text-center text-sm font-bold text-white"
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
    <section className="rounded-2xl bg-[#e8eeff] p-4 text-foreground">
      <p className="text-sm font-bold">로그인하면 언제든 다시 볼 수 있어요.</p>
      <p className="mt-1 text-sm leading-6 text-gray-700">
        지금은 게스트로도 열람, 공유, 이미지 저장을 모두 사용할 수 있습니다.
      </p>
      <Link
        href="/login"
        className="mt-3 inline-flex rounded-xl bg-surface-inverse px-4 py-3 text-sm font-bold text-white"
      >
        로그인하고 보관하기
      </Link>
    </section>
  );
}

function SaveFormatSheet({
  isOpen,
  onClose,
  onSelect,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (format: "png" | "jpeg") => void;
}) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/48 p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="image-save-title"
        className="w-full max-w-sm space-y-3 rounded-2xl bg-card p-5 text-foreground"
      >
        <h2 id="image-save-title" className="text-lg font-bold">
          이미지 저장
        </h2>
        <button
          type="button"
          onClick={() => onSelect("png")}
          className="w-full rounded-xl border border-gray-300 bg-card px-4 py-3 text-sm font-bold"
        >
          PNG로 저장 (투명 유지)
        </button>
        <button
          type="button"
          onClick={() => onSelect("jpeg")}
          className="w-full rounded-xl border border-gray-300 bg-card px-4 py-3 text-sm font-bold"
        >
          JPG로 저장 (흰 배경)
        </button>
        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-xl px-4 py-3 text-sm font-bold text-gray-700"
        >
          닫기
        </button>
      </section>
    </div>
  );
}

// 브라우저 모달(window.confirm)은 페이지 스크립트를 멈추고 스타일도 제어할 수 없다.
// ui/dialog 의 인앱 다이얼로그로 맞춘다.
function ConfirmRestartDialog({
  isOpen,
  onCancel,
  onConfirm,
}: {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent
        title="처음부터 다시 만들까요?"
        description="지금 보고 있는 무드보드는 그대로 남아요. 새 테스트를 시작합니다."
      >
        <DialogActions>
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={onCancel}
          >
            그대로 볼게요
          </Button>
          <Button type="button" tone="ink" size="md" onClick={onConfirm}>
            새로 시작할게요
          </Button>
        </DialogActions>
      </DialogContent>
    </Dialog>
  );
}

function ResultActions({
  moodboard,
  onOpenSave,
  onShare,
}: {
  moodboard: GetMoodboardResponse;
  onOpenSave: () => void;
  onShare: () => void;
}) {
  const router = useRouter();
  const [isRestartOpen, setIsRestartOpen] = useState(false);

  return (
    <section className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onShare}
          className="rounded-xl bg-[#2556d9] px-4 py-3 text-sm font-bold text-white"
        >
          SNS 공유
        </button>
        <button
          type="button"
          onClick={onOpenSave}
          className="rounded-xl bg-surface-inverse px-4 py-3 text-sm font-bold text-white"
        >
          이미지 저장
        </button>
      </div>
      {/* 편집은 소유자에게만 보인다 — 공유 링크로 들어온 사람에게는 감춘다. 실제 방어는
          서버의 PATCH 소유자 검증이고, 이 숨김은 그 위에 얹는 안내다 (#126). */}
      <div
        className={
          moodboard.isOwner
            ? "grid grid-cols-3 gap-2"
            : "grid grid-cols-2 gap-2"
        }
      >
        {moodboard.isOwner ? (
          <Link
            href={`/moodboard/${moodboard.id}/edit`}
            className="rounded-xl border border-gray-300 bg-card px-3 py-3 text-center text-xs font-bold text-foreground"
          >
            편집
          </Link>
        ) : null}
        <button
          type="button"
          onClick={() => setIsRestartOpen(true)}
          className="rounded-xl border border-gray-300 bg-card px-3 py-3 text-xs font-bold text-foreground"
        >
          다시 만들기
        </button>
        <Link
          href="/"
          className="rounded-xl border border-gray-300 bg-card px-3 py-3 text-center text-xs font-bold text-foreground"
        >
          홈
        </Link>
      </div>
      <ConfirmRestartDialog
        isOpen={isRestartOpen}
        onCancel={() => setIsRestartOpen(false)}
        onConfirm={() => router.push(`/test/${crypto.randomUUID()}`)}
      />
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
  const [isSaveOpen, setIsSaveOpen] = useState(false);
  const exportRef = useRef<(() => string | null) | null>(null);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2600);
  }, []);

  const handleLoadError = useCallback((error: unknown) => {
    const isMissing =
      error instanceof ApiClientError && error.code === "NOT_FOUND";
    const message = isMissing
      ? "존재하지 않는 무드보드예요."
      : error instanceof ApiClientError
        ? error.message
        : "잠시 뒤 다시 시도해 주세요.";
    setState({ status: "error", message, isMissing });
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

  // 크롭 결과 이미지가 있으면 내보내기는 캔버스 렌더 대신 저장된 이미지를 그대로 쓴다.
  useEffect(() => {
    if (state.status !== "ready") return;
    const url = state.moodboard.exportedImageUrl;
    if (url) exportRef.current = () => url;
  }, [state]);

  const handleDownload = useCallback(
    async (format: "png" | "jpeg") => {
      try {
        const pngDataUrl = exportRef.current?.();
        if (!pngDataUrl) {
          showToast("이미지 준비가 아직 끝나지 않았어요.");
          return;
        }

        const dataUrl =
          format === "jpeg" ? await compositeOnWhite(pngDataUrl) : pngDataUrl;
        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = `mood-me-${moodboardId}.${format === "png" ? "png" : "jpg"}`;
        link.click();
        setIsSaveOpen(false);
        showToast(`${format === "png" ? "PNG" : "JPG"} 이미지로 저장했어요.`);
      } catch (error) {
        console.error(error);
        showToast("이미지를 저장하지 못했어요. 다시 시도해주세요.");
      }
    },
    [moodboardId, showToast],
  );

  const handleShare = useCallback(async () => {
    const url = window.location.href;

    try {
      await copyText(url);
      showToast("공유 링크를 복사했어요.");
    } catch (error) {
      console.error(error);
      showToast("링크 복사에 실패했어요.");
    }
  }, [showToast]);

  if (state.status === "loading") return <LoadingView />;
  if (state.status === "error") {
    return state.isMissing ? (
      <MissingView />
    ) : (
      <ErrorView message={state.message} onRetry={reloadMoodboard} />
    );
  }

  const { moodboard } = state;
  const exportedImageUrl = moodboard.exportedImageUrl ?? null;

  return (
    <main className="flex flex-1 justify-center overflow-y-auto bg-background text-foreground">
      <Toast message={toast} />
      <SaveFormatSheet
        isOpen={isSaveOpen}
        onClose={() => setIsSaveOpen(false)}
        onSelect={handleDownload}
      />
      <div className="w-full max-w-[430px] px-4 py-4">
        <header className="mb-4 flex items-center justify-between">
          <Link
            href="/"
            className="rounded-xl border border-gray-300 bg-card px-3 py-2 text-sm font-bold"
          >
            홈
          </Link>
          <p className="text-sm font-bold">mood·me</p>
        </header>

        {exportedImageUrl ? (
          // 크롭 에디터(#99) 결과 — 평면 이미지를 그대로 보여준다. 투명 영역은 체크보드로 표시.
          <section
            className="mx-auto flex aspect-square w-[360px] max-w-full items-center justify-center overflow-hidden rounded-2xl"
            style={{
              backgroundImage:
                "linear-gradient(45deg, #e5e5e5 25%, transparent 25%), linear-gradient(-45deg, #e5e5e5 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e5e5e5 75%), linear-gradient(-45deg, transparent 75%, #e5e5e5 75%)",
              backgroundSize: "18px 18px",
              backgroundPosition: "0 0, 0 9px, 9px -9px, -9px 0",
              backgroundColor: "#ffffff",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- 크롭 결과는 원격/데이터 URL이라 next/image 최적화 대상이 아니다. */}
            <img
              src={exportedImageUrl}
              alt="크롭한 무드 이미지"
              className="h-full w-full object-contain"
              onError={() => showToast("이미지를 불러오지 못했어요.")}
            />
          </section>
        ) : (
          <section className="mx-auto w-[360px] max-w-full overflow-hidden rounded-2xl bg-surface-inverse">
            <BoardPreview
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
        )}

        <div className="mt-6 space-y-6 pb-8">
          <ReadingBlock moodboard={moodboard} />
          <MoodSpectrum vector={moodboard.moodProfile.mood_vector} />
          <KeywordCloud moodboard={moodboard} />
          <ResultActions
            moodboard={moodboard}
            onOpenSave={() => setIsSaveOpen(true)}
            onShare={handleShare}
          />
          {moodboard.isGuest ? <GuestBanner /> : null}
        </div>
      </div>
    </main>
  );
}
