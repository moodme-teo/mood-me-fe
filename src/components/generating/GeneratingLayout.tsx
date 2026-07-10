"use client";

// 생성중 화면. 마운트 시 생성 요청을 트리거하고 job 상태를 폴링한다(#37/#64).
// completed면 편집 화면으로 자동 이동, failed면 재시도 버튼을 보여준다.

import { useRouter } from "next/navigation";

import GeneratingBoardAnimation from "@/components/generating/GeneratingBoardAnimation";
import GeneratingError from "@/components/generating/GeneratingError";
import GeneratingMessages from "@/components/generating/GeneratingMessages";
import GenerationProgressBar from "@/components/generating/GenerationProgressBar";
import { useGenerationPolling } from "@/components/generating/useGenerationPolling";

const TOTAL_CARDS = 5;

export default function GeneratingLayout({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const { percent, hasError, isRetrying, retry } =
    useGenerationPolling(sessionId);

  const revealedCount = Math.floor((percent / 100) * TOTAL_CARDS);

  if (hasError) {
    return (
      <div className="flex flex-1 items-center justify-center px-6">
        <GeneratingError
          isRetrying={isRetrying}
          onRetry={retry}
          onHome={() => router.push("/")}
        />
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

      <p className="text-xs text-muted-foreground" role="status">
        세션 {sessionId}
      </p>
    </div>
  );
}
