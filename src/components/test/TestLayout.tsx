"use client";

// 추구미 테스트 3막 6단계(A 담기 → B1·B2 덜어내기 → C 그림자 → D 전환 → E 최종 대결)의
// 레이아웃 골격. mock 데이터(src/lib/mood-test/mock.ts)를 쓰고, "다음"은 검증 없이 단계만 넘긴다.
// 실제 선택 상태·검증·여정 로깅·API 연동은 #35에서 구현한다.
// 참고: docs/work/todo/mood-test-questions.md

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import BuildBoardPreview from "@/components/test/BuildBoardPreview";
import StageBody from "@/components/test/StageBody";
import { STAGES } from "@/components/test/stages";
import TestFooter from "@/components/test/TestFooter";
import TestHeader from "@/components/test/TestHeader";
import {
  clearMoodTestDraft,
  saveMoodTestDraft,
} from "@/lib/mood-test/draft-storage";

type Props = {
  initialStepIndex?: number;
  sessionId: string;
};

function clampStepIndex(stepIndex: number) {
  return Math.max(0, Math.min(STAGES.length - 1, stepIndex));
}

export default function TestLayout({ initialStepIndex = 0, sessionId }: Props) {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(() =>
    clampStepIndex(initialStepIndex),
  );

  const stage = STAGES[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === STAGES.length - 1;

  useEffect(() => {
    saveMoodTestDraft({ sessionId, stepIndex });
  }, [sessionId, stepIndex]);

  const goBack = () => {
    if (isFirst) {
      router.push("/");
      return;
    }
    setStepIndex((i) => i - 1);
  };

  const goNext = () => {
    if (isLast) return;
    setStepIndex((i) => i + 1);
  };

  // 마지막(E. 최종 대결) 단계에서는 "다음"이 "무드보드 생성하기"로 전환된다 (PRD 5.3 동작).
  // 실제 생성 요청·여정 저장(#34/#35)은 없고, 이미 존재하는 생성중 placeholder 라우트(#22)로만 이동한다.
  const handleFooterClick = () => {
    if (isLast) {
      clearMoodTestDraft();
      router.push(`/test/${sessionId}/generating`);
      return;
    }
    goNext();
  };

  return (
    // min-h-0: flex 자식이 콘텐츠 크기만큼 늘어나지 않고 부모(뷰포트) 높이 안에서
    // 스스로 줄어들 수 있게 함 — 이게 없으면 아래 overflow-y-auto가 무시되고
    // "다음" 버튼이 하단에 붙지 않는다.
    <div className="flex min-h-0 flex-1 flex-col">
      <TestHeader
        current={stepIndex + 1}
        total={STAGES.length}
        onBack={goBack}
        preview={<BuildBoardPreview />}
      />

      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-4 py-6">
        <section className="flex flex-col gap-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              {stage.step}
            </p>
            <h2 className="mt-1 text-xl font-semibold text-foreground">
              {stage.title}
            </h2>
            {stage.hint && (
              <p className="mt-1 text-sm text-muted-foreground">{stage.hint}</p>
            )}
          </div>
          <StageBody stage={stage} />
          <p className="text-xs text-muted-foreground" role="status">
            세션 {sessionId} · 레이아웃 골격 — 선택 상태·검증 없음
          </p>
        </section>
      </div>

      <TestFooter
        label={isLast ? "무드보드 생성하기 ✨" : "다음"}
        onClick={handleFooterClick}
      />
    </div>
  );
}
