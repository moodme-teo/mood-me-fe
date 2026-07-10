import { Home } from "lucide-react";

import ProgressBar from "@/components/test/ProgressBar";
import { Button } from "@/components/ui/button";

// 프로토타입 헤더: 홈으로 이동 · 가운데 진척 바 · 우측 프리뷰(완성되어 가는 보드).
// 테스트 단계 이동(이전/다음/되돌리기)은 TestFooter가 전담한다.
export default function TestHeader({
  current,
  total,
  onHome,
  preview,
}: {
  current: number;
  total: number;
  onHome: () => void;
  preview?: React.ReactNode;
}) {
  return (
    <header className="flex items-center gap-2 pt-4 pr-5 pb-1 pl-3">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={onHome}
        aria-label="홈으로 이동"
      >
        <Home size={20} strokeWidth={1.8} aria-hidden />
      </Button>
      <ProgressBar current={current} total={total} />
      <div className="flex h-9 w-9 shrink-0 items-center justify-center">
        {preview}
      </div>
    </header>
  );
}
