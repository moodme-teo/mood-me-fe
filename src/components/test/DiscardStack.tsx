"use client";

import {
  AnimatePresence,
  motion,
  type PanInfo,
  useReducedMotion,
} from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { Card } from "@/lib/mood-test/seed";
// 덜어내기(trim1·trim2) 전용 카드 스택. 프로토타입(prototype-test-page/카드 선택
// 프로토타입.dc.html, screen: 'discard')의 "가운데 스택 → 좌우로 넘겨보고, 아래로
// 끌어내려 버린다" 인터랙션을 따른다. 최상단 카드만 조작 가능하고, 좌우 스와이프는
// 로컬 미리보기 순환일 뿐 상태 기계(draft)에는 영향을 주지 않는다 — 폐기만 onToggle을 탄다.

const STACK_SIZE = 4;
const DISCARD_THRESHOLD_Y = 120;
const PEEK_THRESHOLD_X = 80;

const STACK_OFFSETS = [
  { x: 0, y: 0, rotate: 0 },
  { x: -4, y: 3, rotate: -3 },
  { x: 10, y: 6, rotate: 6 },
  { x: -10, y: 10, rotate: -7 },
];

type Props = {
  cards: Card[];
  selectedIds: string[];
  atCapacity: boolean;
  onToggle: (id: string) => void;
};

export default function DiscardStack({
  cards,
  selectedIds,
  atCapacity,
  onToggle,
}: Props) {
  const prefersReducedMotion = useReducedMotion();
  const remaining = cards.filter((card) => !selectedIds.includes(card.id));
  const remainingIds = remaining.map((card) => card.id);

  const [stackOrder, setStackOrder] = useState<string[]>(() =>
    remainingIds.slice(0, STACK_SIZE),
  );

  // 렌더 중 상태 조정(React 공식 패턴) — remaining 집합이 바뀐 프레임에만 재계산해
  // 폐기로 사라진 카드를 걷어내고 다음 카드를 채운다. 좌우 순환은 이 값을 건드리지 않는다.
  const remainingKey = remainingIds.join(",");
  const [lastRemainingKey, setLastRemainingKey] = useState(remainingKey);
  if (remainingKey !== lastRemainingKey) {
    setLastRemainingKey(remainingKey);
    const stillRemaining = new Set(remainingIds);
    setStackOrder((prev) => {
      const kept = prev.filter((id) => stillRemaining.has(id));
      const fresh = remainingIds.filter((id) => !kept.includes(id));
      return [...kept, ...fresh].slice(0, STACK_SIZE);
    });
  }

  const cyclePreview = (direction: "next" | "prev") => {
    setStackOrder((prev) => {
      if (prev.length < 2) return prev;
      return direction === "next"
        ? [...prev.slice(1), prev[0]]
        : [prev[prev.length - 1], ...prev.slice(0, -1)];
    });
  };

  const handleDragEnd = (id: string, info: PanInfo) => {
    const { offset } = info;
    if (offset.y > DISCARD_THRESHOLD_Y && offset.y > Math.abs(offset.x)) {
      onToggle(id);
      return;
    }
    if (Math.abs(offset.x) > PEEK_THRESHOLD_X) {
      cyclePreview(offset.x < 0 ? "next" : "prev");
    }
  };

  const cardMap = new Map(cards.map((card) => [card.id, card]));
  const visible = stackOrder
    .map((id) => cardMap.get(id))
    .filter((card): card is Card => Boolean(card));

  return (
    <div className="flex min-h-[560px] flex-col items-center justify-center gap-9">
      {remaining.length > 0 && (
        <div className="gap- flex w-full items-center justify-between px-5">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="이전 카드 미리보기"
            disabled={visible.length < 2}
            onClick={() => cyclePreview("prev")}
          >
            <ArrowLeft />
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={atCapacity}
            onClick={() => onToggle(stackOrder[0])}
          >
            이 카드 버리기
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="다음 카드 미리보기"
            disabled={visible.length < 2}
            onClick={() => cyclePreview("next")}
          >
            <ArrowRight />
          </Button>
        </div>
      )}

      <div className="relative mb-8 h-[320px] w-full max-w-[240px]">
        <AnimatePresence>
          {visible.map((card, position) => {
            const isFront = position === 0;
            const offset = STACK_OFFSETS[position] ?? STACK_OFFSETS.at(-1)!;
            const draggable = isFront && !atCapacity;
            return (
              <motion.div
                key={card.id}
                className="absolute inset-0 m-auto overflow-hidden rounded-sm shadow-card"
                style={{
                  zIndex: visible.length - position,
                  touchAction: "none",
                }}
                initial={false}
                animate={{
                  x: offset.x,
                  y: offset.y,
                  rotate: prefersReducedMotion ? 0 : offset.rotate,
                  scale: 1,
                  opacity: 1,
                }}
                exit={
                  prefersReducedMotion
                    ? { opacity: 0 }
                    : { y: 260, opacity: 0, rotate: -8 }
                }
                transition={{ type: "spring", stiffness: 340, damping: 30 }}
                drag={draggable && !prefersReducedMotion}
                dragSnapToOrigin
                dragElastic={0.6}
                whileDrag={{ cursor: "grabbing" }}
                onDragEnd={(_, info) => handleDragEnd(card.id, info)}
              >
                <Image
                  src={card.imagePath}
                  alt=""
                  fill
                  sizes="240px"
                  priority={isFront}
                  className="pointer-events-none object-cover"
                  draggable={false}
                />
                <span className="pointer-events-none absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/55 to-transparent px-2.5 pt-6 pb-2 text-left text-[12px] font-medium text-white">
                  {card.label}
                </span>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {remaining.length === 0 && (
          <p className="absolute inset-0 flex items-center justify-center text-center text-muted-foreground text-body-sm">
            여기까지예요 — 다음으로 넘어가 주세요
          </p>
        )}
      </div>
      <p className="text-center text-muted-foreground text-caption">
        아래로 끌어 버리고, <br />
        좌우로 넘겨 미리 봐요
      </p>
    </div>
  );
}
