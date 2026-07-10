import { Progress } from "@/components/ui/progress";

// 프로토타입 헤더의 얇은 진척 바 — 트랙은 공통 Progress(ui)를 쓰고, 헤더 규격에 맞춰
// 높이만 3px로 좁힌다. 아래에 N/총 라벨을 붙인다.
export default function ProgressBar({
  current,
  total,
}: {
  current: number;
  total: number;
}) {
  return (
    <div className="relative flex flex-1 flex-col items-center gap-1">
      <Progress
        value={(current / total) * 100}
        tone="cyan"
        className="h-[4px] max-w-[120px]"
        aria-label="테스트 진행률"
      />
      <span className="absolute top-3 tracking-wide text-muted-foreground text-caption">
        {current} / {total}
      </span>
    </div>
  );
}
