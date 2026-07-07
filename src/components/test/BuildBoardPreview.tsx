// 헤더 우측에 붙는 작은 썸네일. 정사각형 비율 유지 — 결과물 페이지 무드보드 콜라주와 같은 모양.
// #35에서 카드가 이 안에 2차원으로 쌓이는 연출이 들어간다. 크기·스타일은 디자인 확정 후 조정.
export default function BuildBoardPreview() {
  return (
    <div
      aria-label="완성되어 가는 추구미 무드보드"
      className="flex aspect-square h-10 shrink-0 items-center justify-center rounded-md border border-dashed border-neutral-300 text-[9px] leading-tight text-neutral-400"
    >
      보드
    </div>
  );
}
