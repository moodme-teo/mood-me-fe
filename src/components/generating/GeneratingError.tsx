// PRD §5.4/§10.3 예외 케이스 — 이미지 생성·조립 실패 시 에러 화면. 추구미 테스트 결과(journey)는
// 서버 세션에 남아 있어 "다시 만들어보기"는 항상 그 결과로 재생성한다 — 로컬 선택 draft가
// 지워진 것과 무관하다(#115).
type Props = {
  isRetrying: boolean;
  onRetry: () => void;
  onHome: () => void;
};

export default function GeneratingError({
  isRetrying,
  onRetry,
  onHome,
}: Props) {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <p className="text-lg font-semibold text-foreground">
        무드보드를 완성하지 못했어요.
      </p>
      <p className="text-sm text-muted-foreground">
        고른 내용은 그대로 남아 있으니 다시 만들어볼 수 있어요.
      </p>
      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={onRetry}
          disabled={isRetrying}
          className="rounded-xl bg-surface-inverse px-6 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {isRetrying ? "다시 만드는 중" : "다시 만들어보기"}
        </button>
        <button
          type="button"
          onClick={onHome}
          disabled={isRetrying}
          className="text-sm font-medium text-muted-foreground underline underline-offset-2 disabled:opacity-60"
        >
          홈으로
        </button>
      </div>
    </div>
  );
}
