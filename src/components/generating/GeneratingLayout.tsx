"use client";

// 생성중 화면. 마운트 시 생성 요청을 트리거하고 job 상태를 폴링한다(#37/#64).
// completed면 편집 화면으로 자동 이동, failed면 재시도 버튼을 보여준다.

import { useRouter } from "next/navigation";

import GeneratingError from "@/components/generating/GeneratingError";
import GeneratingMessages from "@/components/generating/GeneratingMessages";
import GenerationPercent from "@/components/generating/GenerationPercent";
import GenerationProgressBar from "@/components/generating/GenerationProgressBar";
import { useGenerationPolling } from "@/components/generating/useGenerationPolling";

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
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
      {/* 진행률 → 상태 문구 → 프로그레스바 → 소요 시간 안내 */}
      <div className="flex w-full max-w-xs flex-col items-center gap-4">
        <GenerationPercent percent={percent} />
        <GeneratingMessages isReentry={isReentry} />
        <GenerationProgressBar percent={percent} />
        <p className="text-muted-foreground text-caption">
          완성까지 최대 1분 정도 걸려요
        </p>
      </div>
    </div>
  );
}
