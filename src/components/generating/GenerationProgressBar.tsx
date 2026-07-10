// 생성중 화면 전용 진행률 바 — AI 작업 진행률(0~100%) 표시.
// 테스트 화면의 ProgressBar(단계 기준 current/total)와 겉보기엔 비슷하지만 의미가 달라
// 일부러 따로 둔다: #37에서 실제 job 폴링을 붙이면 정체·급진행 등 AI 특유의 움직임을
// 여기서만 다뤄야 할 수 있다 (테스트 진행바는 항상 정확한 정수 단계라 그럴 일이 없음).
// 퍼센트 숫자는 상단 GenerationPercent가 크게 보여주므로 여기서는 바만 그린다.
import { Progress } from "@/components/ui/progress";

export default function GenerationProgressBar({
  percent,
}: {
  percent: number;
}) {
  return (
    <Progress value={percent} tone="violet" size="sm" className="w-full" />
  );
}
