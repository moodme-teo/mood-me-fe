"use client";

// 추구미 테스트 3막 6단계(A 담기 → B1·B2 덜어내기 → C 그림자 → D 전환×3 → E 최종 대결)의
// 상태관리·검증·여정 로깅. 화면 골격은 #46, 상태 기계는 mood-test-flow.ts/useMoodTestFlow.ts.
// E단계 완료 시 여정 JSON을 POST /api/mood-test-sessions로 1회 전송한다 (§5.7 저장 원칙).
// 참고: docs/work/todo/mood-test-questions.md

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import BuildBoardPreview from "@/components/test/BuildBoardPreview";
import ConfirmResetDialog from "@/components/test/ConfirmResetDialog";
import StageBody from "@/components/test/StageBody";
import TestFooter from "@/components/test/TestFooter";
import TestHeader from "@/components/test/TestHeader";
import { useMoodTestFlow } from "@/components/test/useMoodTestFlow";
import { saveMoodTestSession } from "@/lib/api/save-mood-test-session";
import { ApiClientError } from "@/lib/api-client";
import { ensureGuestSession } from "@/lib/auth/guest-session";
import {
  clearMoodTestDraft,
  loadMoodTestDraft,
  saveMoodTestDraft,
} from "@/lib/mood-test/draft-storage";
import { clearGenerationJobId } from "@/lib/mood-test/generation-job-storage";

type Props = {
  // 홈 "이어서 만들기" 딥링크(#84/#85)가 넘기는 화면 번호. 복원의 근거는 localStorage 드래프트지
  // 이 값이 아니다 — 여기서는 "이어하려고 들어왔다"는 의도를 읽는 데만 쓴다 (#121).
  initialStepIndex?: number;
  sessionId: string;
};

// 브라우저 모달(window.confirm)은 페이지 스크립트를 멈추고 스타일도 제어할 수 없다.
// MoodboardResult 의 ConfirmRestartDialog 와 같은 인앱 다이얼로그로 맞춘다.
function StaleDraftDialog({ onConfirm }: { onConfirm: () => void }) {
  return (
    // 덮개는 창 전체를 덮지만 앱 본문은 max-w-[430px] 가운데 칼럼이다 (app/layout.tsx).
    // justify-center 를 sm 이상에만 걸면, 창이 칼럼보다 넓고 640px 보다 좁은 구간에서
    // 다이얼로그가 창 왼쪽 끝에 붙어 칼럼 밖으로 삐져나온다. 가로 정렬은 항상 가운데로 둔다.
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-surface-inverse/48 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="stale-draft-title"
        className="w-full max-w-sm rounded-2xl bg-card p-5 text-foreground shadow-xl"
      >
        <h2 id="stale-draft-title" className="text-lg font-bold">
          테스트 내용이 새로 바뀌었어요
        </h2>
        <p className="mt-2 text-sm leading-6 text-gray-700">
          질문이 바뀌어서 이전에 진행하던 내용을 이어갈 수 없어요. 홈에서 새로
          시작해 주세요.
        </p>
        <button
          type="button"
          autoFocus
          onClick={onConfirm}
          className="mt-5 w-full rounded-xl bg-surface-inverse px-4 py-3 text-sm font-bold text-white"
        >
          확인
        </button>
      </div>
    </div>
  );
}

/**
 * 드래프트를 읽기 전까지는 아무것도 저장하지 않는다.
 *
 * `reading` 동안 저장을 열어두면, 갓 만든 빈 상태가 복원 대상 드래프트를 덮어쓴다.
 * `blocked` 는 질문 세트가 바뀌어 이어갈 수 없는 상태 — 모달로 막고 선택을 받지 않는다.
 */
type DraftGate = "reading" | "ready" | "blocked";

export default function TestLayout({ initialStepIndex = 0, sessionId }: Props) {
  const router = useRouter();
  const flow = useMoodTestFlow();
  const [gate, setGate] = useState<DraftGate>("reading");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // 화면을 떠나려는 동작을 붙들어 둔다. 확인을 받으면 그때 실행한다.
  const [pendingExit, setPendingExit] = useState<"back" | "home" | null>(null);
  const { restore } = flow;

  // 마운트 직후 1회. localStorage 는 서버 렌더에 없으므로 effect 에서 읽는다.
  // 읽기 결과는 마이크로태스크로 미뤄 반영한다 — effect 본문에서 곧장 setState 하면
  // 렌더가 연쇄한다 (HomeExperience 의 드래프트 조회와 같은 방식).
  useEffect(() => {
    let isActive = true;

    Promise.resolve().then(() => {
      if (!isActive) return;

      const stored = loadMoodTestDraft();

      if (stored.status === "stale") {
        // 이어하려고 들어온 사람에게만 알린다. 새 테스트를 시작한 사람에게는 남의 이야기다.
        if (initialStepIndex > 0) {
          setGate("blocked");
          return;
        }
        clearMoodTestDraft();
      }

      // 다른 세션의 드래프트는 복원하지 않는다 — 곧 이 세션의 것으로 덮인다 (마지막에 쓴 탭이 이긴다).
      if (stored.status === "ok" && stored.draft.sessionId === sessionId) {
        restore({
          screenIndex: stored.draft.stepIndex,
          committed: stored.draft.committed,
          draft: stored.draft.screenDraft,
        });
      }

      setGate("ready");
    });

    return () => {
      isActive = false;
    };
  }, [initialStepIndex, restore, sessionId]);

  useEffect(() => {
    if (gate !== "ready") return;

    saveMoodTestDraft({
      sessionId,
      stepIndex: flow.screenIndex,
      committed: flow.committed,
      screenDraft: flow.draft,
    });
  }, [gate, sessionId, flow.screenIndex, flow.committed, flow.draft]);

  const goHome = () => router.push("/");

  // 화면을 떠나면 지금 고른 것이 사라진다 — 이전으로 가든 홈으로 나가든 마찬가지다.
  // 고른 게 없으면 잃을 것도 없으니 묻지 않는다.
  const leaveScreen = (exit: "back" | "home") => {
    if (flow.hasSelection) {
      setPendingExit(exit);
      return;
    }
    if (exit === "home") goHome();
    else flow.back();
  };

  // 이어갈 수 없는 드래프트를 버리고 나간다. 화면이 inert 라 고른 것도 없으니 되묻지 않는다.
  const handleLeaveStaleDraft = () => {
    clearMoodTestDraft();
    goHome();
  };

  const handleHome = () => leaveScreen("home");
  const handlePrevStage = () => leaveScreen("back");

  // 되돌리기는 화면을 떠나지 않는다. 현재 화면 안에서 draft 를 한 칸 되감을 뿐이라
  // 확인을 받을 이유가 없다.
  const handleUndoSelection = () => {
    flow.undo();
  };

  // "다음" 은 지금 고른 것을 확정하고 넘어간다 — 잃는 게 없으므로 묻지 않는다.
  const handleNext = async () => {
    if (!flow.canConfirm) return;

    if (!flow.isLastScreen) {
      flow.confirm();
      return;
    }

    setSubmitError(null);
    const journey = flow.buildJourneyFromDraft();
    flow.confirm();
    setIsSubmitting(true);
    try {
      // 게스트 신원은 서버가 쿠키로 확인한다 — 여기서는 세션이 있는 상태만 보장한다.
      // 로그인 상태면 서버가 인증 세션을 우선하므로 이 호출은 무해하다.
      await ensureGuestSession();
      await saveMoodTestSession({ sessionId, journey });
      clearMoodTestDraft();
      // 같은 sessionId로 다시 제출한 것일 수 있다(테스트 다시하기) — 이전에 이 세션으로
      // 생성 요청을 보낸 적이 있어도, 방금 낸 새 답변에 대해 반드시 새로 생성해야 한다.
      clearGenerationJobId(sessionId);
      router.push(`/test/${sessionId}/generating`);
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : "저장에 실패했어요. 다시 시도해 주세요.";
      setSubmitError(message);
      setIsSubmitting(false);
    }
  };

  const { kicker, title, hint } = flow.copy;
  const isFinalScreen = flow.screen.kind === "final";

  const isBlocked = gate === "blocked";

  return (
    <>
      {/* min-h-0: flex 자식이 콘텐츠 크기만큼 늘어나지 않고 부모(뷰포트) 높이 안에서
          스스로 줄어들 수 있게 함 — 이게 없으면 아래 overflow-y-auto가 무시되고
          "다음" 버튼이 하단에 붙지 않는다.
          inert: 모달이 떠 있는 동안 뒤 화면은 클릭도 포커스도 받지 않는다. */}
      <div className="flex min-h-0 flex-1 flex-col" inert={isBlocked}>
        <TestHeader
          current={flow.screenIndex + 1}
          total={flow.totalScreens}
          onHome={handleHome}
          preview={<BuildBoardPreview cardIds={flow.previewCardIds} />}
        />

        <div className="no-scrollbar flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto">
          <section className="flex flex-col gap-4">
            <div className="sticky top-0 left-0 z-[99] bg-background/90 [mask-image:linear-gradient(to_bottom,black_80%,transparent_100%)] px-4 pt-3 pb-7 backdrop-blur-md [-webkit-mask-image:linear-gradient(to_bottom,black_80%,transparent_100%)]">
              <p className="font-semibold tracking-wide text-muted-foreground text-caption">
                {kicker}
              </p>
              <h2 className="mt-2 font-[family-name:var(--font-display-kr)] text-[24px] leading-[1.32] font-bold text-foreground">
                {title}
              </h2>
              {hint && (
                <p className="mt-2 text-muted-foreground text-body-sm">
                  {hint}
                </p>
              )}
            </div>
            <div className="px-3">
              <StageBody
                screen={flow.screen}
                poolIds={flow.poolIds}
                draft={flow.draft}
                target={flow.target}
                onToggle={flow.toggle}
              />
            </div>
          </section>
        </div>

        <TestFooter
          showPrevStage={!flow.isFirstScreen}
          onPrevStage={handlePrevStage}
          nextStageLabel={
            isSubmitting
              ? "생성 준비 중..."
              : isFinalScreen
                ? "Create"
                : flow.isLastScreen
                  ? "무드보드 생성하기 ✨"
                  : "다음"
          }
          tone={isFinalScreen ? "cyan" : "sand"}
          onNextStage={handleNext}
          nextStageDisabled={!flow.canConfirm || isSubmitting}
          showUndoSelection={flow.canUndo}
          onUndoSelection={handleUndoSelection}
          errorMessage={submitError}
        />
      </div>
      {isBlocked && <StaleDraftDialog onConfirm={handleLeaveStaleDraft} />}

      {/* blocked 일 때는 뒤 화면이 inert 라 이전·홈을 누를 수 없다 — 두 모달은 겹치지 않는다. */}
      <ConfirmResetDialog
        isOpen={pendingExit !== null}
        onCancel={() => setPendingExit(null)}
        onConfirm={() => {
          const exit = pendingExit;
          setPendingExit(null);
          if (exit === "home") goHome();
          else flow.back();
        }}
      />
      <style jsx>{`
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </>
  );
}
