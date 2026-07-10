"use client";

import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  useHistoryCarousel,
  wrapDelta,
} from "@/app/_components/useHistoryCarousel";
import { Button } from "@/components/ui/button";
import type { MoodboardSummary } from "@/lib/moodboard/summary";

// docs/design/history-page.png — 저장한 무드보드를 화면 중앙에 가로로 겹쳐 배치하고,
// 좌우 스와이프 또는 하단 다이얼로 원형(무한 순환) 넘겨본다. 다이얼과 카드는 같은
// `position` 을 공유해 한쪽을 돌리면 다른 쪽도 함께 돈다. 중앙 카드의 버튼을 누르면
// 해당 무드보드 결과(상세) 페이지로 이동한다.

type Props = {
  moodboards: MoodboardSummary[];
};

// 카드 한 칸을 넘기는 데 필요한 다이얼 회전각(도). position×이 값 = 다이얼 회전각.
const DIAL_ANGLE_PER_CARD = 18;
// 화면 밖 카드까지 그리지 않도록, 중앙에서 이만큼 떨어진 카드까지만 렌더한다.
const VISIBLE_RANGE = 2;

function MoodboardImage({ moodboard }: { moodboard: MoodboardSummary }) {
  const [hasFailed, setHasFailed] = useState(false);

  if (hasFailed) {
    return (
      <div className="flex h-full items-end bg-surface-sunken p-4 font-semibold text-foreground text-body-sm">
        {moodboard.typeName}
      </div>
    );
  }

  return (
    <Image
      fill
      unoptimized
      src={moodboard.thumbnailUrl}
      alt={`${moodboard.typeName} 무드보드 썸네일`}
      sizes="(max-width: 768px) 70vw, 320px"
      className="object-cover"
      draggable={false}
      onError={() => setHasFailed(true)}
    />
  );
}

/** 하단 회전 다이얼 — 큰 바퀴의 윗부분만 보이며, position 에 따라 회전한다. */
function Dial({
  angle,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  isDragging,
}: {
  angle: number;
  onPointerDown: (event: React.PointerEvent) => void;
  onPointerMove: (event: React.PointerEvent) => void;
  onPointerUp: (event: React.PointerEvent) => void;
  isDragging: boolean;
}) {
  const ticks = Array.from({ length: 72 });

  return (
    <div
      className="relative mx-auto h-16 w-full max-w-[420px] cursor-grab touch-none overflow-hidden active:cursor-grabbing"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      aria-hidden="true"
    >
      {/* 중앙 지시선 — 현재 선택 위치를 가리킨다(고정). */}
      <div className="absolute top-0 left-1/2 z-10 h-4 w-0.5 -translate-x-1/2 rounded-full bg-foreground" />
      {/* 바퀴 — 화면 아래로 대부분 잠기고 윗호(arc)만 노출된다. */}
      <div
        className="absolute top-3 left-1/2 aspect-square w-[720px] -translate-x-1/2 rounded-full"
        style={{
          transform: `translateX(-50%) rotate(${angle}deg)`,
          transition: isDragging
            ? "none"
            : "transform 0.45s cubic-bezier(0.22,1,0.36,1)",
        }}
      >
        {ticks.map((_, index) => {
          const isMajor = index % 6 === 0;
          return (
            <span
              key={index}
              className="absolute top-0 left-1/2 origin-[50%_360px] bg-gray-400"
              style={{
                height: isMajor ? 14 : 9,
                width: isMajor ? 2 : 1,
                transform: `translateX(-50%) rotate(${index * (360 / ticks.length)}deg)`,
                opacity: isMajor ? 0.9 : 0.5,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

export default function HistoryCarousel({ moodboards }: Props) {
  const count = moodboards.length;
  const {
    position,
    activeIndex,
    isDragging,
    step,
    beginDrag,
    moveDrag,
    endDrag,
  } = useHistoryCarousel(count);

  const stageRef = useRef<HTMLDivElement>(null);
  const [spacing, setSpacing] = useState(200);

  // 무대 너비에 맞춰 카드 간격을 반응형으로 계산(드래그 민감도와 배치에 함께 쓰임).
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const update = () => {
      const width = stage.clientWidth;
      setSpacing(Math.max(140, Math.min(width * 0.42, 240)));
    };
    update();

    const observer = new ResizeObserver(update);
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  const handleCardPointerDown = useCallback(
    (event: React.PointerEvent) => {
      // 버튼/링크(결과 보기·좌우 이동) 위에서 시작한 포인터는 드래그로 잡지 않는다.
      // 포인터 캡처가 클릭을 삼키는 것을 막아 탭 내비게이션을 보장한다.
      if ((event.target as HTMLElement).closest("a,button")) return;
      event.currentTarget.setPointerCapture(event.pointerId);
      beginDrag(event.clientX, spacing);
    },
    [beginDrag, spacing],
  );

  const handleDialPointerDown = useCallback(
    (event: React.PointerEvent) => {
      event.currentTarget.setPointerCapture(event.pointerId);
      // 다이얼은 바퀴 느낌이 나도록 카드보다 살짝 둔감하게(한 칸 = 더 긴 드래그).
      beginDrag(event.clientX, spacing * 1.35);
    },
    [beginDrag, spacing],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent) => moveDrag(event.clientX),
    [moveDrag],
  );

  const handlePointerUp = useCallback(() => {
    endDrag();
  }, [endDrag]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        step(-1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        step(1);
      }
    },
    [step],
  );

  if (count === 0) return null;

  const activeMoodboard = moodboards[activeIndex];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <section
        aria-roledescription="carousel"
        aria-label="저장한 무드보드"
        className="relative flex min-h-0 flex-1 flex-col justify-end"
      >
        {/* 카드 무대 — 포인터 드래그로 좌우 스와이프 */}
        <div
          ref={stageRef}
          role="group"
          tabIndex={0}
          aria-label={`${count}개 중 ${activeIndex + 1}번째, ${activeMoodboard.typeName}`}
          onPointerDown={handleCardPointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onKeyDown={handleKeyDown}
          className="relative h-[min(60vh,440px)] w-full cursor-grab touch-pan-y overflow-hidden ring-ring outline-none focus-visible:ring-2 active:cursor-grabbing"
        >
          {moodboards.map((moodboard, index) => {
            const delta = wrapDelta(index - position, count);
            const distance = Math.abs(delta);
            if (distance > VISIBLE_RANGE + 0.5) return null;

            const clamped = Math.min(distance, VISIBLE_RANGE);
            const isActive = index === activeIndex;

            return (
              <div
                key={moodboard.id}
                className="absolute top-1/2 left-1/2 aspect-[3/4] h-[78%]"
                style={{
                  transform: `translate(-50%, -50%) translateX(${delta * spacing}px) scale(${1 - clamped * 0.16})`,
                  opacity: 1 - clamped * 0.4,
                  zIndex: 100 - Math.round(distance * 10),
                  transition: isDragging
                    ? "none"
                    : "transform 0.45s cubic-bezier(0.22,1,0.36,1), opacity 0.45s ease",
                  pointerEvents: isActive ? "auto" : "none",
                }}
                aria-hidden={!isActive}
              >
                <div className="relative h-full w-full overflow-hidden rounded-[var(--radius-lg)] bg-surface-sunken shadow-card">
                  <MoodboardImage moodboard={moodboard} />
                  {moodboard.isGuest ? (
                    <span className="absolute top-3 left-3 rounded-full bg-surface-inverse/80 px-2 py-1 font-semibold text-white text-caption">
                      임시
                    </span>
                  ) : null}
                  {/* 카드 위 버튼 → 무드보드 상세(결과물) 페이지 */}
                  {isActive ? (
                    <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 bg-gradient-to-t from-black/55 to-transparent p-4 pt-10">
                      <p className="line-clamp-1 font-semibold text-white/90 text-body-sm">
                        {moodboard.typeName}
                      </p>
                      <Button
                        asChild
                        variant="primary"
                        tone="ink"
                        size="md"
                        className="w-full font-semibold"
                      >
                        <Link href={`/moodboard/${moodboard.id}`}>
                          결과 보기
                          <ArrowRight className="size-4" strokeWidth={2} />
                        </Link>
                      </Button>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}

          {/* 좌우 이동 버튼 — 데스크톱/키보드 접근성 보조 */}
          <button
            type="button"
            onClick={() => step(-1)}
            aria-label="이전 무드보드"
            className="absolute top-1/2 left-2 z-[120] grid size-9 -translate-y-1/2 place-items-center rounded-full bg-surface-card/85 text-foreground shadow-card ring-ring transition outline-none hover:bg-surface-card focus-visible:ring-2"
          >
            <ChevronLeft className="size-5" strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={() => step(1)}
            aria-label="다음 무드보드"
            className="absolute top-1/2 right-2 z-[120] grid size-9 -translate-y-1/2 place-items-center rounded-full bg-surface-card/85 text-foreground shadow-card ring-ring transition outline-none hover:bg-surface-card focus-visible:ring-2"
          >
            <ChevronRight className="size-5" strokeWidth={2} />
          </button>
        </div>

        {/* 하단 다이얼 — 돌리면 카드가 함께 회전 */}
        <Dial
          angle={position * DIAL_ANGLE_PER_CARD}
          isDragging={isDragging}
          onPointerDown={handleDialPointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        />
      </section>

      {/* 선택 상태 변화를 스크린리더에 알림 */}
      <p className="sr-only" aria-live="polite">
        {`${activeIndex + 1} / ${count} · ${activeMoodboard.typeName}`}
      </p>
    </div>
  );
}
