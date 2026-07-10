"use client";

// 생성중 화면. 마운트 시 생성 요청을 트리거하고 job 상태를 폴링한다(#37/#64).
// completed면 편집 화면으로 자동 이동, failed면 재시도 버튼을 보여준다.

import { useRouter } from "next/navigation";

import GeneratingBoardAnimation from "@/components/generating/GeneratingBoardAnimation";
import GeneratingError from "@/components/generating/GeneratingError";
import GeneratingMessages from "@/components/generating/GeneratingMessages";
import GenerationPercent from "@/components/generating/GenerationPercent";
import GenerationProgressBar from "@/components/generating/GenerationProgressBar";
import { useGenerationPolling } from "@/components/generating/useGenerationPolling";

const TOTAL_CARDS = 5;

export default function GeneratingLayout({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const {
    percent,
    failureReason,
    statusMessage,
    isRetrying,
    isReentry,
    retry,
  } = useGenerationPolling(sessionId);

  const revealedCount = Math.floor((percent / 100) * TOTAL_CARDS);

  if (failureReason) {
    return (
      <div className="flex flex-1 items-center justify-center px-6">
        <GeneratingError
          reason={failureReason}
          statusMessage={statusMessage}
          isRetrying={isRetrying}
          onRetry={retry}
          onHome={() => router.push("/")}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-16 px-6 py-12">
      {/* 상단: 진행률 → 상태 문구 → 프로그레스바 */}
      <div className="flex w-full max-w-xs flex-col items-center gap-4">
        <GenerationPercent percent={percent} />
        <GeneratingMessages isReentry={isReentry} />
        <GenerationProgressBar percent={percent} />
      </div>

      {/* 하단: 인터랙티브하게 채워지는 무드보드 생성 연출 */}
      <GeneratingBoardAnimation revealedCount={revealedCount} />
    </div>
  );
}
