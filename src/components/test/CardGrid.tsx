"use client";

import { motion } from "framer-motion";
import Image from "next/image";

import type { Card } from "@/lib/mood-test/seed";

// 담기·덜어내기 공용 카드 그리드. 프로토타입(prototype-test-page)의 3열 매스너리 콜라주 +
// 탭 시 "쏙 담기는" pop 연출을 따른다. 선택은 상태 기계(useMoodTestFlow)의 toggle 을 그대로 쓰고,
// 여기서는 시각/모션만 담당한다 — 정원(target)을 채우면 미선택 카드는 흐려지며 잠긴다.
// 고정 푸터를 피하는 하단 여백은 TestLayout 의 스크롤 영역이 --test-footer-h 로 한 번에 잡는다.
//
// 매스너리를 CSS 다단(column-count)으로 만들지 않는다 — iOS Safari(WebKit)는 다단 컨테이너의
// 컬럼 재분배를 초기 레이아웃 뒤 갱신하지 않아, 첫 진입에 첫 행이 1장만 보이다가 스크롤(강제
// 리플로우) 때야 3장으로 잡히는 버그가 있다(웹·안드로이드 Blink 는 정상). 대신 카드를 3개 컬럼으로
// 직접 나눠(가장 낮은 컬럼부터 채우는 그리디 분배로 높이 균형) 각 컬럼을 flex 로 쌓는다 — 어느
// 엔진에서도 첫 페인트부터 배치가 확정된다.

// 카드 세로비를 인덱스로 번갈아 줘 콜라주 리듬을 만든다(전부 정사각이면 격자처럼 딱딱해진다).
const ASPECTS = ["3 / 4", "1 / 1", "4 / 5", "3 / 4", "5 / 6", "1 / 1"];

const COLUMN_COUNT = 3;

type PlacedCard = { card: Card; index: number };

// 카드를 3개 컬럼에 나눈다. 매번 "지금 가장 낮은 컬럼"에 다음 카드를 넣어(그리디) CSS 다단의
// column-fill:balance 와 비슷하게 컬럼 높이를 고르게 맞춘다. 높이는 세로비에서 유도한다
// (컬럼 폭이 고정이므로 상대 높이 = 높이/너비). index 는 원래 순서를 유지해 ASPECTS·로딩 우선순위에 쓴다.
function distributeIntoColumns(cards: Card[]): PlacedCard[][] {
  const columns: PlacedCard[][] = Array.from(
    { length: COLUMN_COUNT },
    () => [],
  );
  const heights = new Array<number>(COLUMN_COUNT).fill(0);

  cards.forEach((card, index) => {
    const [w, h] = ASPECTS[index % ASPECTS.length].split("/").map(Number);
    const shortest = heights.indexOf(Math.min(...heights));
    columns[shortest].push({ card, index });
    heights[shortest] += h / w;
  });

  return columns;
}

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
  const columns = distributeIntoColumns(cards);

  return (
    <div className="grid grid-cols-3 gap-x-2 pt-12">
      {columns.map((column, columnIndex) => (
        <div key={columnIndex} className="flex flex-col gap-y-2.5">
          {column.map(({ card, index }) => {
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
                style={{ aspectRatio: ASPECTS[index % ASPECTS.length] }}
                className={`relative block w-full overflow-hidden rounded-sm transition-shadow outline-none focus-visible:ring-3 focus-visible:ring-ring/50 ${
                  selected ? "shadow-card-press" : "shadow-card-hover"
                } ${disabled ? "cursor-default" : "cursor-pointer"}`}
              >
                <Image
                  src={card.imagePath}
                  alt=""
                  fill
                  sizes="(max-width: 430px) 30vw, 130px"
                  className="object-cover"
                  loading={index === 0 ? "eager" : "lazy"}
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
      ))}
    </div>
  );
}
