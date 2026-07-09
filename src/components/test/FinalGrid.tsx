"use client";

import { motion } from "framer-motion";
import Image from "next/image";

import { CARDS, TRANSITIONS } from "@/lib/mood-test/seed";

// E. 최종 대결 — 확신(카드) 5장 + 열망(전환 선택) 3개 혼합 그리드.
// 프로토타입(step5)의 "보드에 자리 잡는" 연출을 따라, 고른 카드는 pop 하며 순번 배지가 찍힌다.
// 열망(텍스트) 항목은 이미지가 없으므로 보라 그라디언트 카드로 표현해 확신 카드와 결을 맞춘다.
const CARD_MAP = new Map(CARDS.map((card) => [card.id, card]));
const TRANSITION_MAP = new Map(TRANSITIONS.map((t) => [t.id, t]));

type Props = {
  poolIds: string[];
  selectedIds: string[];
  atCapacity: boolean;
  onToggle: (id: string) => void;
};

export default function FinalGrid({
  poolIds,
  selectedIds,
  atCapacity,
  onToggle,
}: Props) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {poolIds.map((id) => {
        const card = CARD_MAP.get(id);
        const transition = card ? undefined : TRANSITION_MAP.get(id);
        const label = card?.label ?? transition?.label ?? id;
        const order = selectedIds.indexOf(id);
        const selected = order !== -1;
        const disabled = !selected && atCapacity;
        return (
          <motion.button
            key={id}
            type="button"
            onClick={() => onToggle(id)}
            disabled={disabled}
            aria-pressed={selected}
            aria-label={label}
            whileTap={{ scale: 0.92 }}
            animate={{
              scale: selected ? 0.95 : 1,
              opacity: disabled ? 0.35 : 1,
            }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            className={`relative flex aspect-[3/4] items-center justify-center overflow-hidden rounded-md transition-shadow outline-none focus-visible:ring-3 focus-visible:ring-ring/50 ${
              selected ? "shadow-violet" : "shadow-card"
            } ${card ? "" : "bg-[image:var(--gradient-violet-soft)]"} ${
              disabled ? "cursor-default" : "cursor-pointer"
            }`}
          >
            {card && (
              <Image
                src={card.imagePath}
                alt=""
                fill
                sizes="(max-width: 430px) 30vw, 130px"
                className="object-cover"
              />
            )}
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
            <span
              className={`pointer-events-none px-1.5 text-center text-[11px] font-medium ${
                card
                  ? "absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/55 to-transparent pt-4 pb-1 text-left text-white"
                  : "text-foreground"
              }`}
            >
              {label}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
