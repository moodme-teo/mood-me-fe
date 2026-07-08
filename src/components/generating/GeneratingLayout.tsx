"use client";

// 생성중 화면 레이아웃 골격. 더미 진행률이 타이머로 0→100% 자동 진행되며
// 프로그레스바·로테이션 메시지·채워지는 애니메이션을 눈으로 확인할 수 있게 한다.
// 실제 job 폴링·완료 시 편집 화면 이동·재시도는 #37에서 이 위에 연결한다.

import { useEffect, useState } from "react";

import GeneratingBoardAnimation from "@/components/generating/GeneratingBoardAnimation";
import GeneratingError from "@/components/generating/GeneratingError";
import GeneratingMessages from "@/components/generating/GeneratingMessages";
import GenerationProgressBar from "@/components/generating/GenerationProgressBar";

const TOTAL_CARDS = 5;
const TICK_MS = 400;
const PERCENT_PER_TICK = 4; // 100% 도달까지 약 10초

export default function GeneratingLayout({ sessionId }: { sessionId: string }) {
  const [percent, setPercent] = useState(0);
  const [showErrorPreview, setShowErrorPreview] = useState(false);

  useEffect(() => {
    if (percent >= 100) return;
    const id = setInterval(() => {
      setPercent((p) => Math.min(100, p + PERCENT_PER_TICK));
    }, TICK_MS);
    return () => clearInterval(id);
  }, [percent]);

  const revealedCount = Math.floor((percent / 100) * TOTAL_CARDS);

  if (showErrorPreview) {
    return (
      <div className="flex flex-1 items-center justify-center px-6">
        <GeneratingError onRetry={() => setShowErrorPreview(false)} />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-12">
      <GeneratingBoardAnimation revealedCount={revealedCount} />

      <div className="flex w-full flex-col items-center gap-3">
        <GeneratingMessages />
        <GenerationProgressBar percent={percent} />
      </div>

      <button
        type="button"
        onClick={() => setShowErrorPreview(true)}
        className="text-xs text-muted-foreground underline"
      >
        (레이아웃 확인용) 실패 상태 미리보기
      </button>

      <p className="text-xs text-muted-foreground" role="status">
        세션 {sessionId} · 레이아웃 골격 — 실제 job 폴링 없음
      </p>
    </div>
  );
}
