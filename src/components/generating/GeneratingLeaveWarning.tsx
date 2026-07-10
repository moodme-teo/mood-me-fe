import { Button } from "@/components/ui/button";
import { Dialog, DialogActions, DialogContent } from "@/components/ui/dialog";

type Props = {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

// 생성 중 뒤로가기·앞으로가기 시도를 가로채 보여주는 주의 안내(useConfirmLeave). 새로고침·
// 탭 닫기는 같은 훅의 beforeunload가 네이티브 확인창으로 따로 처리한다.
export default function GeneratingLeaveWarning({
  isOpen,
  onCancel,
  onConfirm,
}: Props) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent
        title="무드보드를 만드는 중이에요"
        description="지금 벗어나도 생성은 계속 진행되고, 다시 돌아오면 이어서 볼 수 있어요."
      >
        <DialogActions>
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={onCancel}
          >
            계속 기다리기
          </Button>
          <Button type="button" tone="ink" size="md" onClick={onConfirm}>
            나가기
          </Button>
        </DialogActions>
      </DialogContent>
    </Dialog>
  );
}
