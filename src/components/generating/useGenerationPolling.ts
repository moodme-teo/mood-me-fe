import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { createGenerationJob } from "@/lib/api/create-generation-job";
import { getGenerationJob } from "@/lib/api/get-generation-job";

const POLL_INTERVAL_MS = 2000;

// 생성중 화면 전용 폴링 — 마운트 시 생성을 트리거하고, completed면 편집 화면으로 이동,
// failed면 에러 상태를 노출한다. 현재 폴링 지점이 여기 한 곳뿐이라 TanStack Query 없이
// 직접 구현한다 (docs/convention/state.md — 도입 신호가 올 때까지 보류).
export function useGenerationPolling(sessionId: string) {
  const router = useRouter();
  const [percent, setPercent] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const timerRef = useRef<number | null>(null);

  const retry = useCallback(() => {
    setHasError(false);
    setPercent(0);
    setAttempt((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    function clearTimer() {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }

    async function poll() {
      try {
        const job = await getGenerationJob(sessionId);
        if (cancelled) return;

        if (job.status === "completed") {
          setPercent(100);
          router.push(`/test/${sessionId}/edit`);
          return;
        }
        if (job.status === "failed") {
          setHasError(true);
          return;
        }
        setPercent(job.progressPercent);
        timerRef.current = window.setTimeout(poll, POLL_INTERVAL_MS);
      } catch {
        if (!cancelled) setHasError(true);
      }
    }

    async function start() {
      try {
        await createGenerationJob(sessionId);
      } catch {
        if (!cancelled) setHasError(true);
        return;
      }
      if (!cancelled) poll();
    }

    start();

    return () => {
      cancelled = true;
      clearTimer();
    };
  }, [attempt, router, sessionId]);

  return { percent, hasError, retry };
}
