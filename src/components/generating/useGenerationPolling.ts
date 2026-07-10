import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { createGenerationJob } from "@/lib/api/create-generation-job";
import { getGenerationJob } from "@/lib/api/get-generation-job";
import {
  loadGenerationJobId,
  saveGenerationJobId,
} from "@/lib/mood-test/generation-job-storage";
import { preloadImage } from "@/lib/preload-image";

const POLL_INTERVAL_MS = 2000;
const FILL_TICK_MS = 200;
const START_PERCENT = 10;
const FILL_CEILING_PERCENT = 92;
// gpt-image-2(quality=medium) 실측 40~70초(moodboard-creation.md) — 이미지 엔드포인트는
// 동기 호출이라 백엔드가 세밀한 진행률을 못 준다(job은 processing 10% → completed 100%
// 두 단계뿐). 그래서 예상 소요 시간 기준으로 클라이언트가 채운다 — "로딩은 기다림이 아니라
// 연출"(docs/convention/ai.md §Streaming/진행 표시). 완료 신호가 오기 전까지는 상한 밑에서만 찬다.
const EXPECTED_DURATION_MS = 60_000;
// 폴링(GET .../generation-job) 한 번 튀는 것으로 40~70초짜리 작업의 UI를 죽이지 않는다 —
// 서버 job은 멀쩡히 도는 중일 수 있다. 연속 실패가 이 횟수를 넘어야 진짜 에러로 본다(#122).
const MAX_CONSECUTIVE_POLL_FAILURES = 3;
// runGenerationPipeline의 첫 문장이 status:"processing" UPDATE라(generate-mood-analysis.ts),
// queued에 이만큼 머문다는 것은 AI 호출이 시작도 못 했다는 뜻이다(after() 인계 실패) — "AI가
// 오래 걸린다"가 아니라 "시작조차 못 했다"이므로 별도 문구로 실패 처리한다(#122, PRD §10.3).
const QUEUED_STALL_TIMEOUT_MS = 15_000;
// processing은 이미지(90초×1재시도=180초)·분석(120초×1재시도=240초)이 동시에 돌고
// runGenerationPipeline은 둘 다 끝나야 반환된다 — 정상적으로도 240초까지 걸릴 수 있다.
// 그보다 여유 있게, 그리고 라우트 maxDuration(300초, generate/route.ts)보다는 짧게 잡아야
// 서버가 죽어 다시는 응답이 안 오는 job(#168)을 무한 폴링하지 않는다.
const PROCESSING_STALL_TIMEOUT_MS = 270_000;

// 생성중 화면의 실패 원인 — 문구가 갈래마다 다르다(PRD §10.3).
// - "generation": 이미지 생성·조립 실패, 또는 폴링이 연속 실패를 견디지 못함
// - "queued_stall": after() 인계 자체가 시작되지 못함. AI는 시작도 안 했다
// - "processing_stall": after() 백그라운드 실행이 중간에 죽어(maxDuration 등) job이
//   processing에 멈춘 채 다시는 응답하지 않는다 — 서버가 실패로 확정짓지 못해
//   status_message도 없다(#168)
export type GenerationFailureReason =
  "generation" | "queued_stall" | "processing_stall";

// 생성중 화면 전용 폴링 — 마운트 시 생성을 트리거하고, completed면 편집 화면으로 이동,
// failed면 에러 상태를 노출한다. 현재 폴링 지점이 여기 한 곳뿐이라 TanStack Query 없이
// 직접 구현한다 (docs/convention/state.md — 도입 신호가 올 때까지 보류).
export function useGenerationPolling(sessionId: string) {
  const router = useRouter();
  const [percent, setPercent] = useState(0);
  const [failureReason, setFailureReason] =
    useState<GenerationFailureReason | null>(null);
  // "generation" 실패일 때만 서버가 남긴 구체적 사유가 있을 수 있다(markJobFailed) — 없으면
  // GeneratingError가 일반 문구로 폴백한다.
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  // 재진입(새로고침·뒤로가기)으로 기존 job을 이어 폴링하는 중인지 — "당신이 고른 공기를
  // 모으는 중…" 같은 신규 생성 문구 대신 "만들던 무드보드를 다시 불러오고 있어요."를
  // 보여주는 데 쓴다(#115 문구, PRD §10.3).
  const [isReentry, setIsReentry] = useState(false);
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
    let consecutiveFailures = 0;
    // queued/processing을 각각 처음 관측한 시각(클라이언트 기준) — 이 값을 기준으로
    // 정체를 판정한다. 다른 상태로 넘어가면 해당 값을 null로 되돌린다.
    let queuedSince: number | null = null;
    let processingSince: number | null = null;

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

    function fail(reason: GenerationFailureReason) {
      clearTimers();
      setFailureReason(reason);
    }

    async function poll() {
      try {
        const job = await getGenerationJob(sessionId);
        if (cancelled) return;
        consecutiveFailures = 0;

        if (job.status === "completed") {
          clearTimers();
          setPercent(100);
          // 편집 화면(CropCanvas)이 마운트되면 이 URL로 이미지를 처음부터 다시 받는다
          // (crossOrigin=anonymous, canvas export를 위해 CORS 요청이어야 해서). 화면
          // 전환·서버 컴포넌트 렌더링이 끝나는 동안 놀리지 않고 여기서 미리 받아두면,
          // 편집 화면 도착 시점엔 이미 캐시돼 있어 "이미지를 불러오는 중"이 거의 안 보인다.
          // 같은 crossOrigin 설정으로 받아야 브라우저가 같은 캐시 엔트리로 본다.
          if (job.baseImageUrl) {
            preloadImage(job.baseImageUrl, "anonymous");
          }
          router.push(`/test/${sessionId}/edit`);
          return;
        }
        if (job.status === "failed") {
          setStatusMessage(job.statusMessage);
          fail("generation");
          return;
        }
        if (job.status === "queued") {
          queuedSince ??= Date.now();
          if (Date.now() - queuedSince >= QUEUED_STALL_TIMEOUT_MS) {
            fail("queued_stall");
            return;
          }
          processingSince = null;
        } else if (job.status === "processing") {
          processingSince ??= Date.now();
          if (Date.now() - processingSince >= PROCESSING_STALL_TIMEOUT_MS) {
            fail("processing_stall");
            return;
          }
          queuedSince = null;
        }
        timerRef.current = window.setTimeout(poll, POLL_INTERVAL_MS);
      } catch {
        if (cancelled) return;
        consecutiveFailures += 1;
        if (consecutiveFailures >= MAX_CONSECUTIVE_POLL_FAILURES) {
          fail("generation");
          return;
        }
        // 아직 견딜 수 있는 실패 — 진행률 연출은 그대로 두고 다음 주기에 다시 본다.
        timerRef.current = window.setTimeout(poll, POLL_INTERVAL_MS);
      }
    }

    async function start() {
      // 재진입(attempt === 0)이면 이 세션에 이미 보낸 생성 요청이 있는지 먼저 본다 —
      // 있으면 새로고침·뒤로가기·재진입 어떤 경로로 와도 새 job을 만들지 않고 그대로
      // 폴링을 이어간다. 재시도(attempt > 0)는 사용자가 명시적으로 새 생성을 원한
      // 것이므로 로컬 보존 값을 보지 않고 항상 새 job을 만든다(#115).
      const storedJobId = attempt === 0 ? loadGenerationJobId(sessionId) : null;
      setIsReentry(Boolean(storedJobId));

      if (!storedJobId) {
        try {
          const { jobId } = await createGenerationJob(sessionId);
          saveGenerationJobId(sessionId, jobId);
        } catch {
          if (!cancelled) {
            setFailureReason("generation");
            setIsRetrying(false);
          }
          return;
        }
      }

      if (cancelled) return;
      setFailureReason(null);
      setStatusMessage(null);
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

  return {
    percent,
    hasError: failureReason !== null,
    failureReason,
    statusMessage,
    isRetrying,
    isReentry,
    retry,
  };
}
