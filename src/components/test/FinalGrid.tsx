"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowDownLeft, ArrowDownRight, ArrowUpRight } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

import FinalCarouselCard from "@/components/test/FinalCarouselCard";
import { CARDS, TRANSITIONS } from "@/lib/mood-test/seed";

// E. 최종 대결 — 대각선 캐러셀에서 초점 카드를 우측 하단으로 끌어내려 3장을 탈락시키는
// 걸러내기(subtractive) 인터랙션(step5-1~5-3). draft(= keptIds)는 상태 기계에서
// "남길 카드"를 뜻하므로, poolIds에서 시작해 탈락 때마다 onReject(id)로 draft를 줄인다
// (mood-test-flow.ts의 commitScreen/target 계약은 그대로). 5장이 남으면 3+2 그리드로
// 전환되고, 확정 CTA는 공용 TestFooter가 "Create →"로 대신한다(TestLayout).
const CARD_MAP = new Map(CARDS.map((card) => [card.id, card]));
const TRANSITION_MAP = new Map(TRANSITIONS.map((t) => [t.id, t]));

function resolveCardVisual(id: string) {
  const card = CARD_MAP.get(id);
  const transition = card ? undefined : TRANSITION_MAP.get(id);
  return {
    label: card?.label ?? transition?.label ?? id,
    imagePath: card?.imagePath,
  };
}

// 캐러셀 높이는 뷰포트를 따라 줄어든다 — 540px 로 고정하면 아이폰 13 미니처럼 짧은 화면에서
// 카드 라벨이 고정 푸터(TestFooter) 뒤로 내려간다.

// 3열(위) + 2열(가운데 정렬, 아래) 배치를 6칸 그리드로 표현한다.
const COMPLETE_GRID_SPAN = [
  "col-span-2",
  "col-span-2",
  "col-span-2",
  "col-span-2 col-start-2",
  "col-span-2 col-start-4",
];

type Props = {
  poolIds: string[];
  keptIds: string[];
  target: number;
  onReject: (id: string) => void;
};

export default function FinalGrid({
  poolIds,
  keptIds,
  target,
  onReject,
}: Props) {
  const remainingIds = poolIds.filter((id) => keptIds.includes(id));
  const isComplete = remainingIds.length <= target;

  // 지연 초기화 — 마운트 시점의 pool 길이로 정중앙 카드부터 시작한다(첫 장이 아니라).
  const [focusIndex, setFocusIndex] = useState(() =>
    Math.floor(remainingIds.length / 2),
  );

  // 렌더 중 상태 조정(React 공식 패턴, DiscardStack.tsx와 동일) — 탈락으로 remainingIds가
  // 줄어든 프레임에만 focusIndex를 새 길이 안으로 다시 맞춘다.
  const remainingKey = remainingIds.join(",");
  const [lastRemainingKey, setLastRemainingKey] = useState(remainingKey);
  if (remainingKey !== lastRemainingKey) {
    setLastRemainingKey(remainingKey);
    setFocusIndex((prev) =>
      Math.min(prev, Math.max(remainingIds.length - 1, 0)),
    );
  }

  const moveFocus = (direction: "prev" | "next") => {
    setFocusIndex((i) =>
      direction === "next"
        ? Math.min(i + 1, remainingIds.length - 1)
        : Math.max(i - 1, 0),
    );
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      moveFocus("prev");
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      moveFocus("next");
    }
  };

  if (isComplete) {
    return (
      <div className="grid grid-cols-6 gap-2">
        {remainingIds.map((id, index) => {
          const { label, imagePath } = resolveCardVisual(id);
          return (
            <motion.div
              layout
              key={id}
              initial={{ opacity: 0, scale: 0.82, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{
                type: "spring",
                stiffness: 320,
                damping: 28,
                delay: index * 0.05,
              }}
              className={`relative flex aspect-[3/4] items-center justify-center overflow-hidden rounded-sm shadow-card ${
                COMPLETE_GRID_SPAN[index] ?? "col-span-2"
              } ${imagePath ? "" : "bg-white"}`}
            >
              {imagePath && (
                <Image
                  src={imagePath}
                  alt=""
                  fill
                  sizes="(max-width: 430px) 30vw, 130px"
                  className="object-cover"
                  draggable={false}
                />
              )}
              <span
                className={`pointer-events-none px-1.5 text-center text-[11px] font-medium ${
                  imagePath
                    ? "absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/55 to-transparent pt-4 pb-1 text-left text-white"
                    : "text-foreground"
                }`}
              >
                {label}
              </span>
            </motion.div>
          );
        })}
      </div>
    );
  }

  return (
    <div
      role="group"
      aria-roledescription="carousel"
      aria-label="최종 카드 고르기 — 우측 하단으로 끌어 탈락시켜요"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="relative isolate h-[min(540px,56dvh)] overflow-hidden outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <button
        type="button"
        aria-label="현재 카드 버리기"
        onClick={() => onReject(remainingIds[focusIndex])}
        className="absolute right-3 bottom-3 z-[110] flex cursor-pointer items-center gap-0.5 text-[10px] text-muted-foreground/70 hover:text-muted-foreground"
      >
        끌어서 버리기
        <ArrowDownRight className="size-3" />
      </button>
      <button
        type="button"
        aria-label="이전 카드 보기"
        disabled={focusIndex <= 0}
        onClick={() => moveFocus("prev")}
        className="absolute top-3 right-3 z-[110] flex cursor-pointer items-center gap-0.5 text-[10px] text-muted-foreground/70 hover:text-muted-foreground disabled:pointer-events-none disabled:opacity-0"
      >
        이전 카드
        <ArrowUpRight className="size-3" />
      </button>
      <button
        type="button"
        aria-label="다음 카드 보기"
        disabled={focusIndex >= remainingIds.length - 1}
        onClick={() => moveFocus("next")}
        className="absolute bottom-3 left-3 z-[110] flex cursor-pointer items-center gap-0.5 text-[10px] text-muted-foreground/70 hover:text-muted-foreground disabled:pointer-events-none disabled:opacity-0"
      >
        <ArrowDownLeft className="size-3" />
        다음 카드
      </button>
      <AnimatePresence>
        {remainingIds.map((id, index) => {
          const { label, imagePath } = resolveCardVisual(id);
          const distance = index - focusIndex;
          const isFocused = distance === 0;
          return (
            <FinalCarouselCard
              key={id}
              label={label}
              imagePath={imagePath}
              distance={distance}
              isFocused={isFocused}
              onFocus={() => setFocusIndex(index)}
              onSwipe={moveFocus}
              onReject={() => onReject(id)}
            />
          );
        })}
      </AnimatePresence>
    </div>
  );
}
