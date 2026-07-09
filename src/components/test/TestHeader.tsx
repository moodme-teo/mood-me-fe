import ProgressBar from "@/components/test/ProgressBar";

// 프로토타입 헤더: 셰브론 뒤로가기 · 가운데 진척 바 · 우측 프리뷰(완성되어 가는 보드).
export default function TestHeader({
  current,
  total,
  onBack,
  preview,
}: {
  current: number;
  total: number;
  onBack: () => void;
  preview?: React.ReactNode;
}) {
  return (
    <header className="flex items-center gap-3.5 px-5 pt-5 pb-1">
      <button
        type="button"
        onClick={onBack}
        aria-label="이전 질문으로"
        className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-foreground transition-colors outline-none hover:bg-surface-sunken focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M15 5L7 12L15 19"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <ProgressBar current={current} total={total} />
      <div className="flex h-9 w-9 shrink-0 items-center justify-center">
        {preview}
      </div>
    </header>
  );
}
