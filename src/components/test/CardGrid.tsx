"use client";

import { motion } from "framer-motion";
import Image from "next/image";

import type { Card } from "@/lib/mood-test/seed";

// 담기·덜어내기 공용 카드 그리드. 탭 시 "쏙 담기는" pop 연출을 따른다. 선택은 상태 기계
// (useMoodTestFlow)의 toggle 을 그대로 쓰고, 여기서는 시각/모션만 담당한다 — 정원(target)을
// 채우면 미선택 카드는 흐려지며 잠긴다. 고정 푸터를 피하는 하단 여백은 TestLayout 의 스크롤
// 영역이 --test-footer-h 로 한 번에 잡는다.
//
// iOS Safari(WebKit) 실기기에서 하나씩 걸린 문제를 피하려고, iOS 에서 말썽인 CSS 를 셋 다 안 쓴다:
//   - CSS 다단(column-count): 컬럼 재분배가 스크롤 전엔 안 잡혀 첫 행이 1장만 보였다(#171).
//   - row-gap(세로 gap): grid·flex 모두, aspect-ratio 카드가 아래로 살짝 넘쳐 세로 간격을 덮었다.
//   - aspect-ratio: 위 넘침의 원인 + flex-basis 폭 위에선 높이를 못 구해 카드가 0 높이로 무너졌다.
// 그래서 폭은 grid-cols-3(가로 gap 은 column-gap 으로 정상), 높이는 padding-bottom %(옛 비율 박스,
// 넘침 없음), 세로 간격은 margin-bottom(gap 에 의존 안 함)으로 준다. 카드는 grid 가 행 우선으로
// 자동 배치하고, 세로비(높이)는 "행" 기준이라 한 행 3장이 같은 높이 → 가로줄이 맞는다.

// 행별 세로 높이 = 카드 폭 대비 % (padding-bottom 은 폭 기준). 3:4·1:1·4:5·5:6 을 높이%로 환산.
// 행마다 높이를 번갈아 줘 밋밋한 격자 대신 리듬을 만든다(전부 정사각이면 딱딱해진다).
const ROW_HEIGHTS = ["133.333%", "100%", "125%", "120%"];

// 한 행에 놓이는 카드 수(grid-cols-3 과 일치). 세로 높이를 행 인덱스로 유도하는 데 쓴다.
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
  return (
    <div className="grid grid-cols-3 items-start gap-x-2 pt-12">
      {cards.map((card, index) => {
        const order = selectedIds.indexOf(card.id);
        const selected = order !== -1;
        const disabled = !selected && atCapacity;
        const paddingBottom =
          ROW_HEIGHTS[Math.floor(index / ROW_SIZE) % ROW_HEIGHTS.length];
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
            // 높이는 padding-bottom(폭 기준 %)으로 만든다 — aspect-ratio 를 피한다.
            // 세로 간격은 margin-bottom(mb-2.5) — row-gap 을 피한다.
            style={{ paddingBottom }}
            className={`relative mb-2.5 block w-full overflow-hidden rounded-sm transition-shadow outline-none focus-visible:ring-3 focus-visible:ring-ring/50 ${
              selected ? "shadow-card-press" : "shadow-card-hover"
            } ${disabled ? "cursor-default" : "cursor-pointer"}`}
          >
            <Image
              src={card.imagePath}
              alt=""
              fill
              sizes="(max-width: 430px) 30vw, 130px"
              className="object-cover"
              // 첫 행(위 3장)은 즉시 보이므로 eager, 나머지는 lazy.
              loading={index < ROW_SIZE ? "eager" : "lazy"}
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
}
