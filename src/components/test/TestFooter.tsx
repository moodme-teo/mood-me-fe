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
    <footer className="fixed bottom-0 left-0 flex w-full flex-col items-center px-4 pb-14">
      {errorMessage && (
        <p
          role="alert"
          className="mb-2 text-center text-destructive text-body-sm"
        >
          {errorMessage}
        </p>
      )}
      <div className="flex">
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
