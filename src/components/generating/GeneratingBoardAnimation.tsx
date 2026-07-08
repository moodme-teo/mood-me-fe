import Image from "next/image";

import { CARDS } from "@/lib/mood-test/seed";

// PRD 5.4 F-13 — 선택한 이미지들이 순차적으로 배치되며 채워지는 연출.
// 더미로 시드 카드 5장을 표본 삼아 revealedCount만큼 순서대로 나타나게 한다.
// 실제 생성 결과 이미지 연결은 #37 몫.
const SAMPLE_CARDS = CARDS.slice(0, 5);

export default function GeneratingBoardAnimation({
  revealedCount,
}: {
  revealedCount: number;
}) {
  return (
    <div
      aria-label="채워지는 무드보드"
      className="grid aspect-square grid-cols-3 gap-2 rounded-2xl border border-gray-100 bg-surface-sunken p-3"
    >
      {SAMPLE_CARDS.map((card, i) => (
        <div
          key={card.id}
          className="relative overflow-hidden rounded-lg bg-gray-100 transition-opacity duration-700"
          style={{ opacity: i < revealedCount ? 1 : 0 }}
        >
          <Image
            src={card.imagePath}
            alt={card.label}
            fill
            sizes="120px"
            className="object-cover"
          />
        </div>
      ))}
    </div>
  );
}
