"use client";

import {
  Download,
  Home,
  Pencil,
  RotateCcw,
  Share2,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { BoardPreview, compositeOnWhite } from "@/components/canvas";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogActions, DialogContent } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { deleteMoodboard } from "@/lib/api/delete-moodboard";
import type { GetMoodboardResponse } from "@/lib/api/get-moodboard";
import { getMoodboard } from "@/lib/api/get-moodboard";
import { retryMoodboardAnalysis } from "@/lib/api/retry-moodboard-analysis";
import { ApiClientError } from "@/lib/api-client";
import { getLoginPath } from "@/lib/auth/redirect-url";
import type { MoodVector } from "@/types/moodboard";
import { MOODBOARD_HEIGHT, MOODBOARD_WIDTH } from "@/types/moodboard";

// exportedImageUrl이 Supabase Storage의 원격 URL일 수 있다(#163). <a download>는 교차
// 출처 URL에서 신뢰할 수 없고, compositeOnWhite의 캔버스 합성도 CORS 없이는 tainted
// 캔버스로 막힌다 — 한 번 fetch해 데이터 URL로 바꾸면 이후 로직은 그대로 재사용된다.
async function toDataUrl(url: string): Promise<string> {
  if (url.startsWith("data:")) return url;

  const blob = await (await fetch(url)).blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

// 재시도 후 결과를 기다리는 동안 쓰는 폴링 상수 — 생성중 화면(useGenerationPolling)과 같은
// 간격이지만 여긴 훨씬 가볍다: 이미지·저장·공유는 이미 끝난 상태고 mood_profile 하나만 본다.
const ANALYSIS_RETRY_POLL_INTERVAL_MS = 3000;
// GPT-5 분석 실측 40~95초 구간(generate-mood-analysis.ts) — 넉넉히 20회(60초)까지 본다.
// 그 이상 걸리면 폴링을 접고 사용자가 다시 시도하거나 새로고침하게 둔다 — 이 폴링은 연출이지
// 실패 판정 기준이 아니다.
const ANALYSIS_RETRY_MAX_POLLS = 20;

type Props = {
  moodboardId: string;
};

// 서버가 대조해준 isOwner가 필요해 도메인 타입(Moodboard) 대신 API 응답 타입을 쓴다 (#126).
type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string; isMissing: boolean }
  | { status: "ready"; moodboard: GetMoodboardResponse };

// 결과 페이지 3가지 접근 시나리오 (#157) — isOwner(서버 대조값)와 "직후 진입" 신호를 조합한다.
// justCompleted는 URL을 벗어나면(새로고침·재방문) 사라지는 일회성 신호라 history와 구분된다.
type ResultScenario = "justCompleted" | "history" | "shared";

function resolveScenario(
  isOwner: boolean,
  justCompleted: boolean,
): ResultScenario {
  if (!isOwner) return "shared";
  return justCompleted ? "justCompleted" : "history";
}

// MoodboardCropEditor.tsx의 테스트 완료 리다이렉트가 붙이는 "직후 진입" 신호.
const JUST_COMPLETED_QUERY_KEY = "from";
const JUST_COMPLETED_QUERY_VALUE = "complete";

type SpectrumTone = "pink" | "violet" | "cyan" | "green" | "mustard";

// 축 5개 = 브랜드 밝은 팔레트 5색과 1:1 — 각 축을 고유 색으로 구분한다.
const MOOD_AXES: {
  key: keyof MoodVector;
  left: string;
  right: string;
  tone: SpectrumTone;
}[] = [
  { key: "calm_energy", left: "고요", right: "활기", tone: "mustard" },
  { key: "warm_cool", left: "따뜻", right: "서늘", tone: "cyan" },
  { key: "minimal_maximal", left: "미니멀", right: "맥시멀", tone: "pink" },
  { key: "real_dreamy", left: "현실", right: "몽환", tone: "violet" },
  { key: "vintage_modern", left: "빈티지", right: "모던", tone: "green" },
];

function Toast({ message }: { message: string | null }) {
  if (!message) return null;

  return (
    <div
      role="status"
      className="fixed top-4 left-1/2 z-40 w-[calc(100%-32px)] max-w-sm -translate-x-1/2 rounded-lg bg-surface-inverse px-4 py-3 text-sm font-semibold text-on-inverse shadow-ink"
    >
      {message}
    </div>
  );
}

function LoadingView() {
  return (
    <main className="flex flex-1 justify-center overflow-y-auto bg-background px-4 py-5 text-foreground">
      <div className="w-full max-w-[430px] animate-pulse space-y-4 motion-reduce:animate-none">
        <div className="h-12 rounded-lg bg-gray-100" />
        <div className="mx-auto h-[520px] w-full max-w-[360px] rounded-xl bg-gray-100" />
        <div className="h-28 rounded-lg bg-gray-100" />
        <div className="h-44 rounded-lg bg-gray-100" />
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
      <Card className="w-full max-w-sm gap-4 px-5 text-center">
        <h1 className="text-heading-md">존재하지 않는 무드보드예요.</h1>
        <p className="text-gray-700 text-body-sm">
          링크가 만료됐거나 삭제된 보드예요. 잠시 뒤 홈으로 이동할게요.
        </p>
        <Link
          href="/"
          className={buttonVariants({
            tone: "ink",
            size: "md",
            className: "w-full",
          })}
        >
          지금 홈으로 가기
        </Link>
      </Card>
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
      <Card className="w-full max-w-sm gap-4 px-5 text-center">
        <h1 className="text-heading-md">결과를 불러오지 못했어요.</h1>
        <p className="text-gray-700 text-body-sm">{message}</p>
        <div className="grid grid-cols-2 gap-2">
          <Link
            href="/"
            className={buttonVariants({ variant: "secondary", size: "md" })}
          >
            홈으로
          </Link>
          <Button type="button" tone="ink" size="md" onClick={onRetry}>
            다시 시도
          </Button>
        </div>
      </Card>
    </main>
  );
}

function MoodSpectrum({ vector }: { vector: MoodVector }) {
  return (
    <div className="px-4">
      <h2 className="mb-2 text-heading-md">무드 성향 5축</h2>
      <div className="space-y-4">
        {MOOD_AXES.map((axis) => {
          const value = vector[axis.key];
          const percent = Math.round(value * 100);

          return (
            <div key={axis.key}>
              <div className="flex items-center justify-between text-gray-700 text-label">
                <span>{axis.left}</span>
                <span>{axis.right}</span>
              </div>
              <div className="mt-2 flex items-center gap-3">
                <Progress
                  value={percent}
                  tone={axis.tone}
                  size="sm"
                  className="flex-1"
                />
                <span className="w-9 shrink-0 text-right text-muted-foreground text-caption">
                  {percent}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// PRD §5.6·§10.3 — 분석(GPT-5)이 실패해도 이미지·저장·공유는 정상이다. 잃은 건 해석뿐이라는
// 사실을 먼저 말하고, 그래프 자리에 재시도만 놓는다.
function AnalysisFailedBlock({
  isRetrying,
  onRetry,
}: {
  isRetrying: boolean;
  onRetry: () => void;
}) {
  return (
    <Card className="gap-2 px-4 text-center text-foreground">
      <p className="font-bold text-body-md">무드 성향을 읽어내지 못했어요.</p>
      <p className="text-gray-700 text-body-sm">무드보드는 그대로예요.</p>
      <Button
        type="button"
        tone="ink"
        size="md"
        className="mt-1 w-full"
        onClick={onRetry}
        disabled={isRetrying}
      >
        {isRetrying ? "분석 다시 시도하는 중" : "분석 다시 시도"}
      </Button>
    </Card>
  );
}

function ReadingTitle({ moodboard }: { moodboard: GetMoodboardResponse }) {
  const { moodProfile } = moodboard;

  return (
    <div className="flex flex-col items-center gap-2 space-y-2">
      <Badge tone="violet">{moodProfile.type_name}</Badge>
      <h1 className="text-display-sm text-foreground">{moodProfile.title}</h1>
    </div>
  );
}

function ReadingBody({ moodboard }: { moodboard: GetMoodboardResponse }) {
  const { moodProfile } = moodboard;

  return (
    <div className="gap-3 px-4 text-card-foreground text-gray-700 text-body-sm [&>*]:mb-4">
      <p>{moodProfile.reading.conviction}</p>
      <p>{moodProfile.reading.desire}</p>
      <p>{moodProfile.reading.showdown}</p>
    </div>
  );
}

function KeywordCloud({ moodboard }: { moodboard: GetMoodboardResponse }) {
  const { keywords } = moodboard.moodProfile;

  if (keywords.length === 0) return null;

  return (
    <section className="mt-6 mb-12 flex flex-wrap items-center justify-center gap-2">
      {keywords.map((keyword) => (
        <Badge key={keyword} tone="sand">
          {keyword}
        </Badge>
      ))}
    </section>
  );
}

function StickerPhraseCloud({
  moodboard,
}: {
  moodboard: GetMoodboardResponse;
}) {
  const { sticker_phrases: stickerPhrases } = moodboard.moodProfile;

  if (stickerPhrases.length === 0) return null;

  return (
    <section className="grid gap-2">
      {stickerPhrases.map((phrase) => (
        <div key={phrase} className="flex items-center justify-center gap-1">
          <span lang="en" className="-mb-3 font-display-en text-[32px]">
            &ldquo;
          </span>
          <p className="px-4 py-3 text-center font-bold text-body-sm">
            {phrase}
          </p>
          <span lang="en" className="-mb-3 font-display-en text-[32px]">
            &rdquo;
          </span>
        </div>
      ))}
    </section>
  );
}

function GuestBanner({ moodboardId }: { moodboardId: string }) {
  const loginPath = getLoginPath(`/moodboard/${moodboardId}`);

  return (
    <Card className="gap-2 px-4 text-foreground">
      <p className="font-bold text-body-md">
        로그인하면 언제든 다시 볼 수 있어요.
      </p>
      <p className="text-gray-700 text-body-sm">
        지금은 게스트로도 열람, 공유, 이미지 저장을 모두 사용할 수 있습니다.
      </p>
      <Link
        href={loginPath}
        className={buttonVariants({
          tone: "violet",
          size: "md",
          className: "mt-1 w-full",
        })}
      >
        로그인하고 보관하기
      </Link>
    </Card>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-inverse/48 p-4">
      <Card
        role="dialog"
        aria-modal="true"
        aria-labelledby="image-save-title"
        className="w-full max-w-sm gap-3 px-5 text-foreground"
      >
        <h2 id="image-save-title" className="text-heading-md">
          이미지 저장
        </h2>
        <Button
          type="button"
          variant="secondary"
          size="md"
          className="w-full"
          onClick={() => onSelect("png")}
        >
          PNG로 저장 (투명 유지)
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="md"
          className="w-full"
          onClick={() => onSelect("jpeg")}
        >
          JPG로 저장 (흰 배경)
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="md"
          className="w-full"
          onClick={onClose}
        >
          닫기
        </Button>
      </Card>
    </div>
  );
}

// 브라우저 모달(window.confirm)은 페이지 스크립트를 멈추고 스타일도 제어할 수 없다.
// ui/dialog 의 인앱 다이얼로그로 맞춘다.
//
// history 열람 맥락은 "방금 만든 걸 다시"라는 현재 문구와 어긋나지만, 최종 카피는
// UXUI 리더 리뷰에서 확정한다 — 여기서는 시나리오별로 분기할 수 있는 지점만 마련한다 (#157).
const RESTART_DIALOG_COPY: Record<
  "justCompleted" | "history",
  { title: string; description: string }
> = {
  justCompleted: {
    title: "처음부터 다시 만들까요?",
    description:
      "지금 보고 있는 무드보드는 그대로 남아요. 새 테스트를 시작합니다.",
  },
  history: {
    title: "처음부터 다시 만들까요?",
    description:
      "지금 보고 있는 무드보드는 그대로 남아요. 새 테스트를 시작합니다.",
  },
};

function ConfirmRestartDialog({
  scenario,
  isOpen,
  onCancel,
  onConfirm,
}: {
  scenario: "justCompleted" | "history";
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { title, description } = RESTART_DIALOG_COPY[scenario];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent title={title} description={description}>
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

function ConfirmDeleteDialog({
  isOpen,
  isDeleting,
  onCancel,
  onConfirm,
}: {
  isOpen: boolean;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent
        title="이 무드보드를 삭제할까요?"
        description="삭제하면 되돌릴 수 없어요."
      >
        <DialogActions>
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={onCancel}
            disabled={isDeleting}
          >
            취소
          </Button>
          <Button
            type="button"
            tone="pink"
            size="md"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? "삭제하는 중" : "삭제할게요"}
          </Button>
        </DialogActions>
      </DialogContent>
    </Dialog>
  );
}

// !owner(공유) 전용 — 소유 관계가 없는 사람에게는 "다시 만들까요"가 아니라 신규 유입 유도가 맞다.
function TryItYourselfCta() {
  const router = useRouter();

  return (
    <Card className="gap-2 px-4 text-center text-foreground">
      <p className="font-bold text-body-md">나도 이런 무드보드 만들어볼까요?</p>
      <p className="text-gray-700 text-body-sm">
        짧은 테스트로 나만의 AI 무드보드를 만들 수 있어요.
      </p>
      <Button
        type="button"
        tone="violet"
        size="md"
        className="mt-1 w-full"
        onClick={() => router.push(`/test/${crypto.randomUUID()}`)}
      >
        나도 만들어보기
      </Button>
    </Card>
  );
}

function ResultActions({
  moodboard,
  scenario,
  isDeleting,
  onOpenSave,
  onShare,
  onDelete,
}: {
  moodboard: GetMoodboardResponse;
  scenario: ResultScenario;
  isDeleting: boolean;
  onOpenSave: () => void;
  onShare: () => void;
  onDelete: () => void;
}) {
  const router = useRouter();
  const [isRestartOpen, setIsRestartOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-center gap-2">
        <Link
          href="/"
          title="홈"
          aria-label="홈"
          className={buttonVariants({ variant: "secondary", size: "icon-md" })}
        >
          <Home aria-hidden />
        </Link>
        {moodboard.isOwner ? (
          <Link
            href={`/moodboard/${moodboard.id}/edit`}
            title="편집"
            aria-label="편집"
            className={buttonVariants({
              variant: "secondary",
              size: "icon-md",
            })}
          >
            <Pencil aria-hidden />
          </Link>
        ) : null}
        {scenario !== "shared" ? (
          <Button
            type="button"
            variant="secondary"
            size="icon-md"
            title="다시 만들기"
            aria-label="다시 만들기"
            onClick={() => setIsRestartOpen(true)}
          >
            <RotateCcw aria-hidden />
          </Button>
        ) : null}

        <Button
          type="button"
          variant={"secondary"}
          size="icon-md"
          title="이미지 저장"
          aria-label="이미지 저장"
          onClick={onOpenSave}
        >
          <Download aria-hidden />
        </Button>
        {scenario === "history" ? (
          <Button
            type="button"
            variant="secondary"
            size="icon-md"
            title="삭제"
            aria-label="무드보드 삭제"
            className="text-destructive"
            onClick={() => setIsDeleteOpen(true)}
          >
            <Trash2 aria-hidden />
          </Button>
        ) : null}
        {moodboard.isOwner ? (
          <Button
            type="button"
            tone="pink"
            size="md"
            title="SNS 공유"
            aria-label="SNS 공유"
            onClick={onShare}
          >
            <Share2 aria-hidden /> 공유
          </Button>
        ) : null}
      </div>
      {scenario !== "shared" ? (
        <ConfirmRestartDialog
          scenario={scenario}
          isOpen={isRestartOpen}
          onCancel={() => setIsRestartOpen(false)}
          onConfirm={() => router.push(`/test/${crypto.randomUUID()}`)}
        />
      ) : null}
      {scenario === "history" ? (
        <ConfirmDeleteDialog
          isOpen={isDeleteOpen}
          isDeleting={isDeleting}
          onCancel={() => setIsDeleteOpen(false)}
          onConfirm={onDelete}
        />
      ) : null}
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
  const router = useRouter();
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [toast, setToast] = useState<string | null>(null);
  const [isRetryingAnalysis, setIsRetryingAnalysis] = useState(false);
  const [isSaveOpen, setIsSaveOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);
  const exportRef = useRef<(() => string | null) | null>(null);
  const analysisPollTimerRef = useRef<number | null>(null);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2600);
  }, []);

  // "직후 진입" 신호는 한 번 읽고 나면 URL에서 지운다 — 남아 있으면 새로고침·재방문에서도
  // "직후"로 오인된다 (#157). setState를 effect 본문에서 바로 부르면 react-hooks/
  // set-state-in-effect에 걸려 microtask로 한 단계 늦춘다(아래 폴링 setState들과 같은 이유).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get(JUST_COMPLETED_QUERY_KEY) !== JUST_COMPLETED_QUERY_VALUE) {
      return;
    }
    queueMicrotask(() => {
      setJustCompleted(true);
      router.replace(`/moodboard/${moodboardId}`, { scroll: false });
    });
  }, [moodboardId, router]);

  useEffect(() => {
    return () => {
      if (analysisPollTimerRef.current !== null) {
        window.clearTimeout(analysisPollTimerRef.current);
      }
    };
  }, []);

  // "분석 다시 시도" — POST는 즉시 processing을 돌려주고 실제 GPT-5 호출은 서버가 백그라운드로
  // 띄운다(route.ts의 after()). 여기서는 완료·실패가 반영될 때까지 가볍게 폴링한다 —
  // useGenerationPolling과 같은 원칙("요청이 도는 동안 버튼을 잠근다", PRD §11)이지만 이미지·
  // 저장·공유는 건드리지 않으므로 훨씬 단순하다.
  const handleRetryAnalysis = useCallback(() => {
    setIsRetryingAnalysis(true);

    retryMoodboardAnalysis(moodboardId)
      .then(() => {
        let attempts = 0;
        const poll = () => {
          attempts += 1;
          getMoodboard(moodboardId)
            .then((moodboard) => {
              if (
                moodboard.analysisStatus === "processing" &&
                attempts < ANALYSIS_RETRY_MAX_POLLS
              ) {
                analysisPollTimerRef.current = window.setTimeout(
                  poll,
                  ANALYSIS_RETRY_POLL_INTERVAL_MS,
                );
                return;
              }

              setIsRetryingAnalysis(false);
              setState({ status: "ready", moodboard });
              if (moodboard.analysisStatus === "failed") {
                showToast("이번에도 분석에 실패했어요. 다시 시도해 주세요.");
              } else if (moodboard.analysisStatus === "processing") {
                showToast(
                  "생각보다 오래 걸리고 있어요. 잠시 후 새로고침해 보세요.",
                );
              }
            })
            .catch(() => {
              setIsRetryingAnalysis(false);
              showToast("결과를 확인하지 못했어요. 새로고침해 보세요.");
            });
        };
        analysisPollTimerRef.current = window.setTimeout(
          poll,
          ANALYSIS_RETRY_POLL_INTERVAL_MS,
        );
      })
      .catch((error: unknown) => {
        console.error(error);
        setIsRetryingAnalysis(false);
        showToast("분석을 다시 시작하지 못했어요. 잠시 후 다시 시도해 주세요.");
      });
  }, [moodboardId, showToast]);

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
        const source = exportRef.current?.();
        if (!source) {
          showToast("이미지 준비가 아직 끝나지 않았어요.");
          return;
        }
        const pngDataUrl = await toDataUrl(source);

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

  // history 시나리오 전용 — 삭제 성공 시 메인으로 이동한다(#157). 실패는 조용히 삼키지
  // 않고 토스트로 알린다(docs/convention/error.md).
  const handleDelete = useCallback(() => {
    setIsDeleting(true);
    deleteMoodboard(moodboardId)
      .then(() => {
        router.push("/");
      })
      .catch((error: unknown) => {
        console.error(error);
        setIsDeleting(false);
        showToast("삭제하지 못했어요. 다시 시도해 주세요.");
      });
  }, [moodboardId, router, showToast]);

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
  const scenario = resolveScenario(moodboard.isOwner, justCompleted);

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
            title="홈으로 이동"
            aria-label="홈으로 이동"
            className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
          >
            <Home aria-hidden />
          </Link>
          <p className="text-sm font-bold">mood·me</p>
        </header>

        {exportedImageUrl ? (
          // 크롭 에디터(#99) 결과 — 평면 이미지를 그대로 보여준다. 투명 배경으로 만든
          // 이미지는 결과 화면에서도 진짜 투명(페이지 배경이 비쳐 보임)으로 둔다. 체크보드는
          // 편집 중 "여기는 투명"을 알리는 에디터 전용 표시일 뿐, 결과물엔 노출하지 않는다 (#176).
          <section className="mx-auto flex aspect-square w-[360px] max-w-full items-center justify-center overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element -- 크롭 결과는 원격/데이터 URL이라 next/image 최적화 대상이 아니다. */}
            <img
              src={exportedImageUrl}
              alt="크롭한 무드 이미지"
              className="h-full w-full object-contain"
              onError={() => showToast("이미지를 불러오지 못했어요.")}
            />
          </section>
        ) : (
          <section className="mx-auto w-[360px] max-w-full overflow-hidden rounded-xl bg-surface-inverse shadow-card">
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

        <div className="mt-6 space-y-10 pb-8">
          {moodboard.analysisStatus === "failed" ? (
            <AnalysisFailedBlock
              isRetrying={isRetryingAnalysis}
              onRetry={handleRetryAnalysis}
            />
          ) : (
            <>
              <ReadingTitle moodboard={moodboard} />
              <StickerPhraseCloud moodboard={moodboard} />
              <ReadingBody moodboard={moodboard} />
              <KeywordCloud moodboard={moodboard} />
              <MoodSpectrum vector={moodboard.moodProfile.mood_vector} />
            </>
          )}
          <ResultActions
            moodboard={moodboard}
            scenario={scenario}
            isDeleting={isDeleting}
            onOpenSave={() => setIsSaveOpen(true)}
            onShare={handleShare}
            onDelete={handleDelete}
          />
          {scenario === "shared" ? (
            <TryItYourselfCta />
          ) : moodboard.isGuest ? (
            <GuestBanner moodboardId={moodboardId} />
          ) : null}
        </div>
      </div>
    </main>
  );
}
