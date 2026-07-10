"use client";

import { motion } from "framer-motion";
import Image from "next/image";

import { CARDS } from "@/lib/mood-test/seed";

// 헤더 우측 미니 프리뷰. 덜어내기는 상실이 아니라 "남은 카드가 자리를 잡아가는" 경험으로 —
// 카드가 빠질 때 그 자리가 비지 않고 나머지가 재배치된다 (docs/work/todo/mood-test-questions.md).
// framer-motion layout으로 재배치 모션만 주고, 정확한 톤·타이밍은 #55(디자인) 확정 후 조정한다.
const CARD_MAP = new Map(CARDS.map((card) => [card.id, card]));

export default function BuildBoardPreview({ cardIds }: { cardIds: string[] }) {
  return (
    <div
      aria-label="완성되어 가는 추구미 무드보드"
      className="grid h-12 w-12 shrink-0 grid-cols-4 content-start gap-0.5 rounded-md border border-dashed border-gray-300 p-0.5"
    >
      {cardIds.map((id) => {
        const card = CARD_MAP.get(id);
        if (!card) return null;
        return (
          <motion.div
            key={id}
            layout
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="relative aspect-square overflow-hidden rounded-[2px] bg-gray-100"
          >
            <Image
              src={card.imagePath}
              alt=""
              fill
              sizes="12px"
              className="object-cover"
              draggable={false}
            />
          </motion.div>
        );
      })}
    </div>
  );
}
