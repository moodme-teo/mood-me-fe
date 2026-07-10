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

// 상위 단계를 바꾸면 하위 단계의 선택지 구성 자체가 달라져 뒤 단계를 비울 수밖에 없다.
// 조용히 지우면 사용자는 왜 사라졌는지 모른다 — 확정 전에 알리고 되돌릴 기회를 준다.
function ConfirmResetDialog({
  isOpen,
  onCancel,
  onConfirm,
}: {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-surface-inverse/48 p-4 sm:items-center sm:justify-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="reset-title"
        className="w-full max-w-sm rounded-2xl bg-card p-5 text-foreground shadow-xl"
      >
        <h2 id="reset-title" className="text-lg font-bold">
          이전 선택을 바꾸면 이후에 고른 내용이 초기화돼요
        </h2>
        <p className="mt-2 text-sm leading-6 text-gray-700">변경할까요?</p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-gray-300 px-4 py-3 text-sm font-bold text-foreground"
          >
            그대로 둘게요
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-xl bg-surface-inverse px-4 py-3 text-sm font-bold text-white"
          >
            변경할게요
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TestLayout({ sessionId }: Props) {
  const router = useRouter();
  const flow = useMoodTestFlow();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  useEffect(() => {
    saveMoodTestDraft({ sessionId, stepIndex: flow.screenIndex });
  }, [sessionId, flow.screenIndex]);

  const handleBack = () => {
    if (flow.isFirstScreen) {
      router.push("/");
      return;
    }
    flow.back();
  };

  const handleNext = async () => {
    if (!flow.canConfirm) return;

    if (!flow.isLastScreen) {
      // 뒤 단계에 고른 내용이 있고 그게 지워질 참이면 먼저 확인을 받는다.
      if (flow.willResetDownstream) {
        setIsResetConfirmOpen(true);
        return;
      }
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

  return (
    // min-h-0: flex 자식이 콘텐츠 크기만큼 늘어나지 않고 부모(뷰포트) 높이 안에서
    // 스스로 줄어들 수 있게 함 — 이게 없으면 아래 overflow-y-auto가 무시되고
    // "다음" 버튼이 하단에 붙지 않는다.
    <div className="flex min-h-0 flex-1 flex-col">
      <TestHeader
        current={flow.screenIndex + 1}
        total={flow.totalScreens}
        onBack={handleBack}
        preview={<BuildBoardPreview cardIds={flow.previewCardIds} />}
      />

      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-4 py-6">
        <section className="flex flex-col gap-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              {kicker}
            </p>
            <h2 className="mt-1 text-xl font-semibold text-foreground">
              {title}
            </h2>
            {hint && (
              <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
            )}
          </div>
          <StageBody
            screen={flow.screen}
            poolIds={flow.poolIds}
            draft={flow.draft}
            target={flow.target}
            onToggle={flow.toggle}
          />
          <p className="text-xs text-muted-foreground" role="status">
            {flow.draft.length} / {flow.target} 선택됨
          </p>
        </section>
      </div>

      <TestFooter
        label={
          flow.isLastScreen
            ? isSubmitting
              ? "생성 준비 중..."
              : "무드보드 생성하기 ✨"
            : "다음"
        }
        onClick={handleNext}
        disabled={!flow.canConfirm || isSubmitting}
        errorMessage={submitError}
      />

      <ConfirmResetDialog
        isOpen={isResetConfirmOpen}
        onCancel={() => setIsResetConfirmOpen(false)}
        onConfirm={() => {
          setIsResetConfirmOpen(false);
          flow.confirm();
        }}
      />
    </div>
  );
}
