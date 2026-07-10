import { ArrowLeft, RotateCcw } from "lucide-react";
import type { ComponentProps } from "react";

import { Button } from "@/components/ui/button";

type Props = {
  onPrevStage: () => void;
  showPrevStage: boolean;
  onNextStage: () => void;
  nextStageLabel: string;
  nextStageDisabled?: boolean;
  onUndoSelection: () => void;
  showUndoSelection: boolean;
  errorMessage?: string | null;
  tone?: ComponentProps<typeof Button>["tone"];
};

export default function TestFooter({
  onPrevStage,
  showPrevStage,
  onNextStage,
  nextStageLabel,
  nextStageDisabled,
  onUndoSelection,
  showUndoSelection,
  errorMessage,
  tone = "cyan",
}: Props) {
  return (
    // 앱 프레임(max-w-[430px], app/layout.tsx)에 맞춰 가운데 고정한다. left-0 w-full 로 두면
    // 창이 넓을 때 푸터만 창 전체를 덮어 프레임 바깥까지 배경이 번진다.
    // pointer-events: 버튼 사이 빈 띠가 뒤 화면의 탭을 먹지 않도록 푸터는 투과시키고
    // 버튼만 되살린다.
    <footer className="pointer-events-none fixed bottom-0 left-1/2 z-40 flex w-full max-w-[430px] -translate-x-1/2 flex-col items-center px-4 pb-14">
      {/* 카드 이미지 위에서도 버튼 글자가 읽히도록 아래에서 배경색이 차오른다.
          버튼이 놓인 높이까지는 불투명하게 덮고 그 위만 페이드로 흘린다 — 반투명하게 두면
          뒤 카드나 칩이 버튼 글자와 겹쳐 읽힌다. 푸터 박스보다 위로 올라오는 레이어라
          별도로 떼어 둔다(--test-footer-h 계산에 끼지 않게). */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[calc(var(--test-footer-h)+2.5rem)]"
        style={{
          background:
            "linear-gradient(to top, var(--surface-page) 75%, transparent)",
        }}
      />
      {errorMessage && (
        <p
          role="alert"
          className="pointer-events-auto mb-2 text-center text-destructive text-body-sm"
        >
          {errorMessage}
        </p>
      )}
      <div className="pointer-events-auto flex">
        <Button
          type="button"
          variant={"secondary"}
          tone={tone}
          size="icon-lg"
          onClick={onPrevStage}
          aria-label="이전 테스트 단계로 돌아가기"
          className={`!shadow-[0_3px_10px_0_#ffffff90] ${showPrevStage ? "" : "invisible"}`}
        >
          <ArrowLeft />
        </Button>
        <Button
          type="button"
          tone={tone}
          size="lg"
          onClick={onNextStage}
          disabled={nextStageDisabled}
          className="w-[200px] gap-4 !shadow-[0_3px_10px_0_#ffffff90]"
        >
          {nextStageLabel}
          <svg
            width="42"
            height="17"
            viewBox="0 0 42 17"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="-mt-0.5 -mr-6 !w-[36px]"
          >
            <path
              d="M33.9287 1.29274C34.3191 0.902319 34.9522 0.902518 35.3428 1.29274L41.707 7.657C42.0976 8.04753 42.0976 8.68054 41.707 9.07106L35.3428 15.4353C34.9522 15.8255 34.3191 15.8257 33.9287 15.4353C33.5383 15.0449 33.5385 14.4118 33.9287 14.0213L38.5859 9.36403H0V7.36403H38.5859L33.9287 2.70681C33.5385 2.31626 33.5383 1.68317 33.9287 1.29274Z"
              fill="currentColor"
            />
          </svg>
        </Button>
        <Button
          type="button"
          variant={"secondary"}
          tone={tone}
          size="icon-lg"
          onClick={onUndoSelection}
          aria-label="선택 되돌리기"
          className={`${showUndoSelection ? "" : "invisible"}`}
        >
          <RotateCcw />
        </Button>
      </div>
    </footer>
  );
}
