// 프로토타입 헤더의 얇은 진척 바 — 3px 트랙 위 잉크 필이 폭으로 차오르고, 아래에 N/총 라벨.
export default function ProgressBar({
  current,
  total,
}: {
  current: number;
  total: number;
}) {
  return (
    <div className="flex flex-1 flex-col items-center gap-1">
      <div className="h-[3px] w-full overflow-hidden rounded-pill bg-surface-sunken">
        <div
          className="h-full rounded-pill bg-[image:var(--gradient-violet)] transition-[width] duration-[400ms] ease-standard"
          style={{ width: `${(current / total) * 100}%` }}
        />
      </div>
      <span className="tracking-wide text-muted-foreground text-caption">
        {current} / {total}
      </span>
    </div>
  );
}
