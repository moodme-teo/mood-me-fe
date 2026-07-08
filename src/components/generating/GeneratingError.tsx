// PRD 5.4 예외 케이스 — 생성 실패 시 에러 화면 + "다시 시도" 버튼.
// 지금은 클릭해도 동작 없음 — 실제 재시도 로직은 #37에서 연결.
export default function GeneratingError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <p className="text-lg font-semibold text-foreground">
        앗, 생성이 잠깐 멈췄어요
      </p>
      <p className="text-sm text-muted-foreground">
        당신의 선택은 그대로 있어요. 다시 시도하면 이어서 그려드릴게요.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-xl bg-surface-inverse px-6 py-3 text-sm font-semibold text-white"
      >
        다시 시도
      </button>
    </div>
  );
}
