"use client";

// 화면을 떠나면(이전·홈) 지금 화면에서 고른 것이 사라진다 — 확정되지 않은 draft 이기
// 때문이다. 조용히 지우면 사용자는 왜 사라졌는지 모른다. 떠나기 전에 멈춰 세운다 (PRD §5.3).
//
// 열지 말지는 부르는 쪽이 정한다(hasSelection). 이 컴포넌트는 판정하지 않는다.

import { Button } from "@/components/ui/button";
import { Dialog, DialogActions, DialogContent } from "@/components/ui/dialog";

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
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent title="이전 선택시, 현재 선택 내용이 초기화 됩니다.">
        <DialogActions>
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={onCancel}
          >
            그대로 둘게요
          </Button>
          <Button type="button" tone="cyan" size="md" onClick={onConfirm}>
            변경할게요
          </Button>
        </DialogActions>
      </DialogContent>
    </Dialog>
  );
}
