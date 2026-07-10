// 생성중 화면 상단의 큰 진행률 숫자 — 화면의 시선을 먼저 잡는 요소(#37 연출).
// 프로그레스바는 같은 값을 바(bar)로 보여주므로 여기서는 숫자만 크게 강조한다.
// NOTE: violet 글로우 그라디언트를 background-clip:text 로 얹는다. DESIGN.md §2/§8은
// 그라디언트-텍스트를 금지하지만, 생성중 화면의 시그니처 강조로 의도적으로 채택했다.
export default function GenerationPercent({ percent }: { percent: number }) {
  return (
    <p
      role="status"
      aria-label={`생성 진행률 ${percent}%`}
      className="bg-[image:var(--gradient-violet)] bg-clip-text text-5xl font-bold text-transparent tabular-nums"
    >
      {percent}
      <span className="align-top text-2xl">%</span>
    </p>
  );
}
