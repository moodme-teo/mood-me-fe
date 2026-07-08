import { Progress } from "@/components/ui/progress";

export default function ProgressBar({
  current,
  total,
}: {
  current: number;
  total: number;
}) {
  return (
    <div className="flex flex-1 items-center gap-2">
      <Progress
        value={(current / total) * 100}
        tone="violet"
        size="sm"
        className="flex-1"
      />
      <span className="text-xs text-muted-foreground">
        {current} / {total}
      </span>
    </div>
  );
}
