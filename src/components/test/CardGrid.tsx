"use client";

import { motion } from "framer-motion";
import Image from "next/image";

import type { Card } from "@/lib/mood-test/seed";

// 담기·덜어내기 공용 카드 그리드. 탭 시 "쏙 담기는" pop 연출을 따른다. 선택은 상태 기계
// (useMoodTestFlow)의 toggle 을 그대로 쓰고, 여기서는 시각/모션만 담당한다 — 정원(target)을
// 채우면 미선택 카드는 흐려지며 잠긴다. 고정 푸터를 피하는 하단 여백은 TestLayout 의 스크롤
// 영역이 --test-footer-h 로 한 번에 잡는다.
//
// 배치는 flex 로 짠 3열이다(세로=행 스택, 가로=행 안 3칸). CSS 다단(column-count)이나 CSS
// Grid 를 쓰지 않는 이유는 둘 다 iOS Safari(WebKit)에서 문제가 있어서다:
//   - 다단: 컬럼 재분배가 스크롤 전엔 갱신되지 않아 첫 행이 1장만 보였다(#171).
//   - Grid: aspect-ratio 카드와 엮이면 row-gap 이 먹지 않아 세로 간격이 사라졌다.
// flex 의 gap 은 iOS 에서도 정상 동작하므로, 행을 flex-col 로 쌓고 각 행을 flex 로 채운다.

// 세로비는 "행 단위"로 번갈아 준다 — 한 행의 3장은 같은 높이라 가로줄이 딱 맞고, 행이 바뀌면
// 높이가 달라져 밋밋한 격자 대신 리듬이 생긴다(전부 정사각이면 딱딱해진다).
const ROW_ASPECTS = ["3 / 4", "1 / 1", "4 / 5", "5 / 6"];

// 한 행에 놓이는 카드 수.
const ROW_SIZE = 3;

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
  const rows: Card[][] = [];
  for (let i = 0; i < cards.length; i += ROW_SIZE) {
    rows.push(cards.slice(i, i + ROW_SIZE));
  }

  return (
    <div className="flex flex-col gap-y-2.5 pt-12">
      {rows.map((row, rowIndex) => {
        const aspect = ROW_ASPECTS[rowIndex % ROW_ASPECTS.length];
        return (
          <div key={rowIndex} className="flex gap-x-2">
            {row.map((card) => {
              const order = selectedIds.indexOf(card.id);
              const selected = order !== -1;
              const disabled = !selected && atCapacity;
              return (
                <motion.button
                  key={card.id}
                  type="button"
                  onClick={() => onToggle(card.id)}
                  disabled={disabled}
                  aria-pressed={selected}
                  aria-label={card.label}
                  animate={{
                    y: selected ? 4 : 0,
                    opacity: disabled ? 0.35 : selected ? 1 : 0.8,
                  }}
                  transition={{ type: "spring", stiffness: 320, damping: 26 }}
                  style={{ aspectRatio: aspect }}
                  // 마지막 행이 3장 미만이어도 카드 폭은 항상 1/3 로 고정(빈 칸은 그냥 비운다).
                  // gap-x-2(0.5rem)가 2개이므로 폭 = (100% - 1rem) / 3.
                  className={`relative block shrink-0 basis-[calc((100%-1rem)/3)] overflow-hidden rounded-sm transition-shadow outline-none focus-visible:ring-3 focus-visible:ring-ring/50 ${
                    selected ? "shadow-card-press" : "shadow-card-hover"
                  } ${disabled ? "cursor-default" : "cursor-pointer"}`}
                >
                  <Image
                    src={card.imagePath}
                    alt=""
                    fill
                    sizes="(max-width: 430px) 30vw, 130px"
                    className="object-cover"
                    // 첫 행(위 3장)은 즉시 보이므로 eager 로 받고, 나머지는 lazy.
                    loading={rowIndex === 0 ? "eager" : "lazy"}
                    draggable={false}
                  />
                  {selected && (
                    <span className="absolute top-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-[var(--gray-500)] bg-surface-inverse text-[10px] font-bold text-white">
                      {order + 1}
                    </span>
                  )}
                  <span className="pointer-events-none absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/55 to-transparent px-1.5 pt-4 pb-1 text-left text-[11px] font-medium text-white">
                    {card.label}
                  </span>
                </motion.button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
