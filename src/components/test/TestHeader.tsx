import ProgressBar from "@/components/test/ProgressBar";

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
    <header className="flex items-center gap-3 border-b border-gray-100 px-4 py-3">
      <button
        type="button"
        onClick={onBack}
        aria-label="이전 질문으로"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 text-muted-foreground"
      >
        ←
      </button>
      <ProgressBar current={current} total={total} />
      {preview}
    </header>
  );
}
