"use client";

// 화면을 떠나면(이전·홈) 지금 화면에서 고른 것이 사라진다 — 확정되지 않은 draft 이기
// 때문이다. 조용히 지우면 사용자는 왜 사라졌는지 모른다. 떠나기 전에 멈춰 세운다 (PRD §5.3).
//
// 열지 말지는 부르는 쪽이 정한다(hasSelection). 이 컴포넌트는 판정하지 않는다.

import { Button } from "@/components/ui/button";

type Props = {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function ConfirmResetDialog({
  isOpen,
  onCancel,
  onConfirm,
}: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end bg-surface-inverse/48 p-4 sm:items-center sm:justify-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="reset-confirm-title"
        className="w-full max-w-sm rounded-2xl bg-card p-6 text-foreground shadow-xl"
      >
        <h2
          id="reset-confirm-title"
          className="font-[family-name:var(--font-display-kr)] text-[20px] leading-[1.35] font-bold"
        >
          이전 선택시, 현재 선택 내용이 초기화 됩니다.
        </h2>
        <div className="mt-6 flex gap-2">
          <Button
            type="button"
            variant="secondary"
            tone="sand"
            size="md"
            onClick={onCancel}
            className="flex-1"
          >
            그대로 둘게요
          </Button>
          <Button
            type="button"
            tone="cyan"
            size="md"
            onClick={onConfirm}
            className="flex-1"
          >
            변경할게요
          </Button>
        </div>
      </div>
    </div>
  );
}
