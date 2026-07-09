"use client";

import { motion } from "framer-motion";
import Image from "next/image";

import type { Card } from "@/lib/mood-test/seed";

// 담기·덜어내기 공용 카드 그리드. 프로토타입(prototype-test-page)의 3열 매스너리 콜라주 +
// 탭 시 "쏙 담기는" pop 연출을 따른다. 선택은 상태 기계(useMoodTestFlow)의 toggle 을 그대로 쓰고,
// 여기서는 시각/모션만 담당한다 — 정원(target)을 채우면 미선택 카드는 흐려지며 잠긴다.

// 카드 세로비를 인덱스로 번갈아 줘 콜라주 리듬을 만든다(전부 정사각이면 격자처럼 딱딱해진다).
const ASPECTS = ["3 / 4", "1 / 1", "4 / 5", "3 / 4", "5 / 6", "1 / 1"];

type Props = {
  cards: Card[];
  selectedIds: string[];
  atCapacity: boolean;
  onToggle: (id: string) => void;
};

export default function CardGrid({
  cards,
  selectedIds,
  atCapacity,
  onToggle,
}: Props) {
  return (
    <div className="[columns:3] [column-gap:6px]">
      {cards.map((card, index) => {
        const order = selectedIds.indexOf(card.id);
        const selected = order !== -1;
        const disabled = !selected && atCapacity;
        return (
          <motion.button
            key={card.id}
            type="button"
            layout
            onClick={() => onToggle(card.id)}
            disabled={disabled}
            aria-pressed={selected}
            aria-label={card.label}
            whileTap={{ scale: 0.92 }}
            animate={{
              scale: selected ? 0.95 : 1,
              opacity: disabled ? 0.35 : 1,
            }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            style={{ aspectRatio: ASPECTS[index % ASPECTS.length] }}
            className={`relative mb-1.5 block w-full break-inside-avoid overflow-hidden rounded-md transition-shadow outline-none focus-visible:ring-3 focus-visible:ring-ring/50 ${
              selected ? "shadow-violet" : "shadow-card"
            } ${disabled ? "cursor-default" : "cursor-pointer"}`}
          >
            <Image
              src={card.imagePath}
              alt=""
              fill
              sizes="(max-width: 430px) 30vw, 130px"
              className="object-cover"
            />
            {/* 선택 시 보라 링 + 담긴 순번 배지로 "확정" 피드백을 준다. */}
            <span
              aria-hidden
              className={`pointer-events-none absolute inset-0 rounded-md ring-2 transition-opacity ${
                selected
                  ? "opacity-100 ring-accent-violet"
                  : "opacity-0 ring-transparent"
              }`}
            />
            {selected && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 24 }}
                className="absolute top-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-accent-violet text-[11px] font-bold text-white shadow-violet"
              >
                {order + 1}
              </motion.span>
            )}
            <span className="pointer-events-none absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/55 to-transparent px-1.5 pt-4 pb-1 text-left text-[11px] font-medium text-white">
              {card.label}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
