import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { createGenerationJob } from "@/lib/api/create-generation-job";
import { getGenerationJob } from "@/lib/api/get-generation-job";
import {
  loadGenerationJobId,
  saveGenerationJobId,
} from "@/lib/mood-test/generation-job-storage";

const POLL_INTERVAL_MS = 2000;
const FILL_TICK_MS = 200;
const START_PERCENT = 10;
const FILL_CEILING_PERCENT = 92;
// gpt-image-2(quality=medium) 실측 40~70초(moodboard-creation.md) — 이미지 엔드포인트는
// 동기 호출이라 백엔드가 세밀한 진행률을 못 준다(job은 processing 10% → completed 100%
// 두 단계뿐). 그래서 예상 소요 시간 기준으로 클라이언트가 채운다 — "로딩은 기다림이 아니라
// 연출"(docs/convention/ai.md §Streaming/진행 표시). 완료 신호가 오기 전까지는 상한 밑에서만 찬다.
const EXPECTED_DURATION_MS = 60_000;

// 생성중 화면 전용 폴링 — 마운트 시 생성을 트리거하고, completed면 편집 화면으로 이동,
// failed면 에러 상태를 노출한다. 현재 폴링 지점이 여기 한 곳뿐이라 TanStack Query 없이
// 직접 구현한다 (docs/convention/state.md — 도입 신호가 올 때까지 보류).
export function useGenerationPolling(sessionId: string) {
  const router = useRouter();
  const [percent, setPercent] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const timerRef = useRef<number | null>(null);
  const fillTimerRef = useRef<number | null>(null);

  // 에러 화면은 그대로 둔 채 버튼만 잠근다 — 요청이 끝나야(성공→진행 화면 전환,
  // 실패→잠금 해제) 화면이 바뀐다. 연타해도 attempt만 계속 올라갈 뿐 진행 중인
  // 요청과 별개로 새 생성 요청이 나가지는 않는다(§11 변경 요청 버튼 잠금 규칙).
  const retry = useCallback(() => {
    setIsRetrying(true);
    setAttempt((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    function clearTimers() {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (fillTimerRef.current !== null) {
        window.clearInterval(fillTimerRef.current);
        fillTimerRef.current = null;
      }
    }

    function startFillAnimation() {
      const startedAt = Date.now();
      fillTimerRef.current = window.setInterval(() => {
        const elapsed = Date.now() - startedAt;
        const ratio = elapsed / EXPECTED_DURATION_MS;
        const simulated =
          START_PERCENT + ratio * (FILL_CEILING_PERCENT - START_PERCENT);
        setPercent(Math.round(Math.min(FILL_CEILING_PERCENT, simulated)));
      }, FILL_TICK_MS);
    }

    async function poll() {
      try {
        const job = await getGenerationJob(sessionId);
        if (cancelled) return;

        if (job.status === "completed") {
          clearTimers();
          setPercent(100);
          router.push(`/test/${sessionId}/edit`);
          return;
        }
        if (job.status === "failed") {
          clearTimers();
          setHasError(true);
          return;
        }
        timerRef.current = window.setTimeout(poll, POLL_INTERVAL_MS);
      } catch {
        if (!cancelled) {
          clearTimers();
          setHasError(true);
        }
      }
    }

    async function start() {
      // 재진입(attempt === 0)이면 이 세션에 이미 보낸 생성 요청이 있는지 먼저 본다 —
      // 있으면 새로고침·뒤로가기·재진입 어떤 경로로 와도 새 job을 만들지 않고 그대로
      // 폴링을 이어간다. 재시도(attempt > 0)는 사용자가 명시적으로 새 생성을 원한
      // 것이므로 로컬 보존 값을 보지 않고 항상 새 job을 만든다(#115).
      const storedJobId = attempt === 0 ? loadGenerationJobId(sessionId) : null;

      if (!storedJobId) {
        try {
          const { jobId } = await createGenerationJob(sessionId);
          saveGenerationJobId(sessionId, jobId);
        } catch {
          if (!cancelled) {
            setHasError(true);
            setIsRetrying(false);
          }
          return;
        }
      }

      if (cancelled) return;
      setHasError(false);
      setPercent(0);
      setIsRetrying(false);
      startFillAnimation();
      poll();
    }

    start();

    return () => {
      cancelled = true;
      clearTimers();
    };
  }, [attempt, router, sessionId]);

  return { percent, hasError, isRetrying, retry };
}
