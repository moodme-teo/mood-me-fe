"use client";

// 추구미 테스트 3막 6단계(A 담기 → B1·B2 덜어내기 → C 그림자 → D 전환×3 → E 최종 대결)의
// 상태관리·검증·여정 로깅. 화면 골격은 #46, 상태 기계는 mood-test-flow.ts/useMoodTestFlow.ts.
// E단계 완료 시 여정 JSON을 POST /api/mood-test-sessions로 1회 전송한다 (§5.7 저장 원칙).
// 참고: docs/work/todo/mood-test-questions.md

import { useRouter } from "next/navigation";
import { useState } from "react";

import BuildBoardPreview from "@/components/test/BuildBoardPreview";
import StageBody from "@/components/test/StageBody";
import TestFooter from "@/components/test/TestFooter";
import TestHeader from "@/components/test/TestHeader";
import { useMoodTestFlow } from "@/components/test/useMoodTestFlow";
import { saveMoodTestSession } from "@/lib/api/save-mood-test-session";
import { ApiClientError } from "@/lib/api-client";
import { ensureGuestSessionId } from "@/lib/auth/guest-session";

export default function TestLayout({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const flow = useMoodTestFlow();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

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
            <p className="text-xs font-medium text-neutral-400">{kicker}</p>
            <h2 className="mt-1 text-xl font-semibold text-neutral-900">
              {title}
            </h2>
            {hint && <p className="mt-1 text-sm text-neutral-500">{hint}</p>}
          </div>
          <StageBody
            screen={flow.screen}
            poolIds={flow.poolIds}
            draft={flow.draft}
            target={flow.target}
            onToggle={flow.toggle}
          />
          <p className="text-xs text-neutral-400" role="status">
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
    </div>
  );
}
