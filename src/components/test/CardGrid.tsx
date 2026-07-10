"use client";

import { motion } from "framer-motion";
import Image from "next/image";

import type { Card } from "@/lib/mood-test/seed";

// 담기·덜어내기 공용 카드 그리드. 탭 시 "쏙 담기는" pop 연출을 따른다. 선택은 상태 기계
// (useMoodTestFlow)의 toggle 을 그대로 쓰고, 여기서는 시각/모션만 담당한다 — 정원(target)을
// 채우면 미선택 카드는 흐려지며 잠긴다. 고정 푸터를 피하는 하단 여백은 TestLayout 의 스크롤
// 영역이 --test-footer-h 로 한 번에 잡는다.
//
// 배치 골격은 "grid 3열(가로 폭·가로 간격) + 각 열은 flex-col(세로 스택·세로 간격)"이다.
// iOS Safari(WebKit)에서 확인된 제약을 피해 이 조합으로 굳혔다:
//   - CSS 다단(column-count): 컬럼 재분배가 스크롤 전엔 안 잡혀 첫 행이 1장만 보였다(#171).
//   - grid 의 row-gap: aspect-ratio 카드와 엮이면 세로 간격이 사라졌다.
//   - flex-basis(calc)로 준 폭: 그 위의 aspect-ratio 높이를 iOS 가 못 구해 카드가 0 높이로 무너졌다.
// grid 트랙이 준 "확정된 폭" 위에서 aspect-ratio 높이는 정상이고, flex-col 의 gap 은 iOS 에서도
// 먹는다. 카드는 index%3 으로 열에 나누고 세로비는 "행" 기준으로 줘, 세 열의 행별 높이가 같아
// 가로줄이 맞는다(= 행별 동일 높이).

// 세로비는 "행 단위"로 번갈아 준다 — 한 행의 3장은 같은 높이라 가로줄이 딱 맞고, 행이 바뀌면
// 높이가 달라져 밋밋한 격자 대신 리듬이 생긴다(전부 정사각이면 딱딱해진다).
const ROW_ASPECTS = ["3 / 4", "1 / 1", "4 / 5", "5 / 6"];

// 열 수(grid-cols-3 과 일치). 카드를 열에 나누고 세로비를 행 인덱스로 유도하는 데 쓴다.
const COLUMN_COUNT = 3;

type PlacedCard = { card: Card; index: number };

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
  // 읽는 순서(행 우선)를 유지하며 열에 나눈다: 0·1·2 가 첫 행(각 열의 맨 위), 3·4·5 가 둘째 행…
  const columns: PlacedCard[][] = Array.from(
    { length: COLUMN_COUNT },
    () => [],
  );
  cards.forEach((card, index) => {
    columns[index % COLUMN_COUNT].push({ card, index });
  });

  return (
    <div className="grid grid-cols-3 gap-x-2 pt-12">
      {columns.map((column, columnIndex) => (
        <div key={columnIndex} className="flex flex-col gap-y-2.5">
          {column.map(({ card, index }) => {
            const order = selectedIds.indexOf(card.id);
            const selected = order !== -1;
            const disabled = !selected && atCapacity;
            const rowIndex = Math.floor(index / COLUMN_COUNT);
            const aspect = ROW_ASPECTS[rowIndex % ROW_ASPECTS.length];
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
                  // 첫 행(위 3장 = 각 열 index 0·1·2)은 즉시 보이므로 eager, 나머지는 lazy.
                  loading={index < COLUMN_COUNT ? "eager" : "lazy"}
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
