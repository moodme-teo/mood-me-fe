"use client";

import { AnimatePresence, motion } from "framer-motion";
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
  const [hasRejectedOnce, setHasRejectedOnce] = useState(false);

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

  const handleReject = (id: string) => {
    setHasRejectedOnce(true);
    onReject(id);
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
              className={`relative flex aspect-[3/4] items-center justify-center overflow-hidden rounded-md shadow-violet ${
                COMPLETE_GRID_SPAN[index] ?? "col-span-2"
              } ${imagePath ? "" : "bg-[image:var(--gradient-violet-soft)]"}`}
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
      className="relative h-[540px] overflow-hidden outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
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
              showHint={isFocused && !hasRejectedOnce}
              onFocus={() => setFocusIndex(index)}
              onSwipe={moveFocus}
              onReject={() => handleReject(id)}
            />
          );
        })}
      </AnimatePresence>
    </div>
  );
}
