"use client";

// 추구미 테스트 3막 6단계(A 담기 → B1·B2 덜어내기 → C 그림자 → D 전환×3 → E 최종 대결)의
// 상태관리·검증·여정 로깅. 화면 골격은 #46, 상태 기계는 mood-test-flow.ts/useMoodTestFlow.ts.
// E단계 완료 시 여정 JSON을 POST /api/mood-test-sessions로 1회 전송한다 (§5.7 저장 원칙).
// 참고: docs/work/todo/mood-test-questions.md

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import BuildBoardPreview from "@/components/test/BuildBoardPreview";
import StageBody from "@/components/test/StageBody";
import TestFooter from "@/components/test/TestFooter";
import TestHeader from "@/components/test/TestHeader";
import { useMoodTestFlow } from "@/components/test/useMoodTestFlow";
import { saveMoodTestSession } from "@/lib/api/save-mood-test-session";
import { ApiClientError } from "@/lib/api-client";
import { ensureGuestSessionId } from "@/lib/auth/guest-session";
import {
  clearMoodTestDraft,
  saveMoodTestDraft,
} from "@/lib/mood-test/draft-storage";

type Props = {
  // 홈 화면의 "이어하기" 딥링크(#84/#85)가 여전히 이 값을 넘긴다. 실제 선택 상태(카드 등)까지
  // 복원하는 진짜 이어하기는 #68(autosave) 몫이라, 지금은 항상 첫 화면부터 다시 진행한다 —
  // sessionId는 그대로 이어받으므로 완료 시 같은 세션에 upsert된다.
  initialStepIndex?: number;
  sessionId: string;
};

export default function TestLayout({ sessionId }: Props) {
  const router = useRouter();
  const flow = useMoodTestFlow();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    saveMoodTestDraft({ sessionId, stepIndex: flow.screenIndex });
  }, [sessionId, flow.screenIndex]);

  const handleHome = () => {
    router.push("/");
  };

  const handlePrevStage = () => {
    flow.back();
  };

  const handleUndoSelection = () => {
    flow.undo();
  };

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
      const guestSessionId = await ensureGuestSessionId();
      await saveMoodTestSession({ sessionId, guestSessionId, journey });
      clearMoodTestDraft();
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
  const isDiscardScreen =
    flow.screen.kind === "trim1" || flow.screen.kind === "trim2";
  const isFinalScreen = flow.screen.kind === "final";
  const counterText = isDiscardScreen
    ? `${flow.draft.length}/${flow.target} 내려놓음`
    : isFinalScreen
      ? `탈락 ${flow.poolIds.length - flow.draft.length} / ${flow.poolIds.length - flow.target}`
      : `${flow.draft.length} / ${flow.target}`;

  return (
    <>
      {/* min-h-0: flex 자식이 콘텐츠 크기만큼 늘어나지 않고 부모(뷰포트) 높이 안에서
          스스로 줄어들 수 있게 함 — 이게 없으면 아래 overflow-y-auto가 무시되고
          "다음" 버튼이 하단에 붙지 않는다. */}
      <div className="flex min-h-0 flex-1 flex-col">
        <TestHeader
          current={flow.screenIndex + 1}
          total={flow.totalScreens}
          onHome={handleHome}
          preview={<BuildBoardPreview cardIds={flow.previewCardIds} />}
        />

        <div className="no-scrollbar flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 pt-4 pb-6">
          <section className="flex flex-col gap-5">
            <div className="relative">
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
              <span
                className="absolute top-0 right-0 font-medium text-muted-foreground text-caption"
                role="status"
              >
                {counterText}
              </span>
            </div>
            <StageBody
              screen={flow.screen}
              poolIds={flow.poolIds}
              draft={flow.draft}
              target={flow.target}
              onToggle={flow.toggle}
            />
          </section>
        </div>

        <TestFooter
          showPrevStage={!flow.isFirstScreen}
          onPrevStage={handlePrevStage}
          nextStageLabel={
            isSubmitting
              ? "생성 준비 중..."
              : isFinalScreen
                ? "Create →"
                : flow.isLastScreen
                  ? "무드보드 생성하기 ✨"
                  : "다음"
          }
          tone={isFinalScreen ? "violet" : "ink"}
          onNextStage={handleNext}
          nextStageDisabled={!flow.canConfirm || isSubmitting}
          showUndoSelection={flow.canUndo}
          onUndoSelection={handleUndoSelection}
          errorMessage={submitError}
        />
      </div>
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
