export default function ProgressBar({
  current,
  total,
}: {
  current: number;
  total: number;
}) {
  return (
    <div className="flex flex-1 items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-200">
        <div
          className="h-full rounded-full bg-neutral-800 transition-all"
          style={{ width: `${(current / total) * 100}%` }}
        />
      </div>
      <span className="text-xs text-neutral-500">
        {current} / {total}
      </span>
    </div>
  );
}
