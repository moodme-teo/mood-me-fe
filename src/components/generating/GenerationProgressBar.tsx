// 생성중 화면 전용 진행률 바 — AI 작업 진행률(0~100%) 표시.
// 테스트 화면의 ProgressBar(단계 기준 current/total)와 겉보기엔 비슷하지만 의미가 달라
// 일부러 따로 둔다: #37에서 실제 job 폴링을 붙이면 정체·급진행 등 AI 특유의 움직임을
// 여기서만 다뤄야 할 수 있다 (테스트 진행바는 항상 정확한 정수 단계라 그럴 일이 없음).
export default function GenerationProgressBar({
  percent,
}: {
  percent: number;
}) {
  return (
    <div className="flex w-full items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-200">
        <div
          className="h-full rounded-full bg-neutral-800 transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="text-xs text-neutral-500">{percent}%</span>
    </div>
  );
}
