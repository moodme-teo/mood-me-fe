import type { GenerationFailureReason } from "@/components/generating/useGenerationPolling";

// PRD §5.4/§10.3 예외 케이스. 실패 원인마다 문구·버튼이 다르다 — 원인이 다르면 사용자가 할 수
// 있는 일도 다르다.
// - "generation"(이미지 생성·조립 실패): 추구미 테스트 결과(journey)는 서버 세션에 남아 있어
//   "다시 만들어보기"는 항상 그 결과로 재생성한다 — 로컬 선택 draft가 지워진 것과 무관하다(#115).
// - "queued_stall": after() 인계 자체가 시작 못 한 것 — AI는 시작도 안 했으니 "정성 들여
//   만들고 있어요" 류의 문구를 쓰지 않는다. 갈 곳이 없어 다시 시도 하나만 준다(#122).
// - "processing_stall": 생성이 시작은 됐지만 서버가 중간에 죽어 다시는 응답하지 않는 것 —
//   journey는 남아 있으니 "generation"과 같은 재생성 동선을 준다(#168).
type Props = {
  reason: GenerationFailureReason;
  // "generation"이고 서버가 실패 사유를 남긴 경우(markJobFailed)에만 값이 있다 — 있으면
  // 일반 문구 대신 이 구체적 사유를 보여준다(#168).
  statusMessage: string | null;
  isRetrying: boolean;
  onRetry: () => void;
  onHome: () => void;
};

const COPY: Record<
  GenerationFailureReason,
  { title: string; body: string; retryLabel: string; retryingLabel: string }
> = {
  generation: {
    title: "무드보드를 완성하지 못했어요.",
    body: "고른 내용은 그대로 남아 있으니 다시 만들어볼 수 있어요.",
    retryLabel: "다시 만들어보기",
    retryingLabel: "다시 만드는 중",
  },
  queued_stall: {
    title: "생성을 시작하지 못했어요.",
    body: "다시 시도해 주세요.",
    retryLabel: "다시 시도",
    retryingLabel: "다시 시도하는 중",
  },
  processing_stall: {
    title: "생성이 너무 오래 걸리고 있어요.",
    body: "고른 내용은 그대로 남아 있으니 다시 만들어볼 수 있어요.",
    retryLabel: "다시 만들어보기",
    retryingLabel: "다시 만드는 중",
  },
};

const HOME_BUTTON_REASONS: GenerationFailureReason[] = [
  "generation",
  "processing_stall",
];

export default function GeneratingError({
  reason,
  statusMessage,
  isRetrying,
  onRetry,
  onHome,
}: Props) {
  const copy = COPY[reason];
  const body =
    reason === "generation" && statusMessage ? statusMessage : copy.body;

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <p className="text-lg font-semibold text-foreground">{copy.title}</p>
      <p className="text-sm text-muted-foreground">{body}</p>
      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={onRetry}
          disabled={isRetrying}
          className="rounded-xl bg-surface-inverse px-6 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {isRetrying ? copy.retryingLabel : copy.retryLabel}
        </button>
        {HOME_BUTTON_REASONS.includes(reason) ? (
          <button
            type="button"
            onClick={onHome}
            disabled={isRetrying}
            className="text-sm font-medium text-muted-foreground underline underline-offset-2 disabled:opacity-60"
          >
            홈으로
          </button>
        ) : null}
      </div>
    </div>
  );
}
