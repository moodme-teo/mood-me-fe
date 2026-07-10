"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  useHistoryCarousel,
  wrapDelta,
} from "@/app/_components/useHistoryCarousel";
import type { MoodboardSummary } from "@/lib/moodboard/summary";

// docs/design/history-page.png — 저장한 무드보드를 화면 중앙에 가로로 겹쳐 배치하고,
// 좌우 스와이프 또는 하단 다이얼로 원형(무한 순환) 넘겨본다. 다이얼과 카드는 같은
// `position` 을 공유해 한쪽을 돌리면 다른 쪽도 함께 돈다. 중앙 카드를 탭하면
// 해당 무드보드 결과(상세) 페이지로 이동한다.

type Props = {
  moodboards: MoodboardSummary[];
};

// 카드 한 칸을 넘기는 데 필요한 다이얼 회전각(도). position×이 값 = 다이얼 회전각.
const DIAL_ANGLE_PER_CARD = 18;
// 화면 밖 카드까지 그리지 않도록, 중앙에서 이만큼 떨어진 카드까지만 렌더한다.
const VISIBLE_RANGE = 2;
// 다이얼 눈금의 회전 반지름(px) — 가늘고 촘촘한 눈금용이라 값이 작다.
const DIAL_RADIUS_PX = 360;
// delta=1 카드가 옆으로 이동하는 픽셀량(카드 상단 기준 ≈ 반지름 × sin(각도))이
// 스테이지 폭의 이 비율이 되도록 카드 전용 반지름을 스테이지 폭에서 역산한다.
// 너무 크면(예전 고정 760px) 카드가 overflow-hidden 밖으로 완전히 사라지고,
// 너무 작으면 옆 카드가 중앙 카드에 겹쳐 가려진다 — 화면에서 눈으로 보며 조정한 값.
const CARD_EDGE_SHIFT_RATIO = 0.34;
// 카드 내부 콘텐츠를 슬롯 회전각의 이 비율만큼 반대로 되돌려 세운다.
// 1 = 항상 완전히 똑바로, 0 = 다이얼 눈금처럼 슬롯 각도 그대로 기울어짐.
const CARD_TILT_CORRECTION_RATIO = 0.75;
// 무대 높이 대비 카드 높이 비율.
const CARD_HEIGHT_RATIO = 0.78;
// 무대 상단에서 카드까지의 오프셋(%). 옆 카드는 회전 반지름이 커진 만큼 아래로도 처지므로,
// 중앙 정렬(공식상 (1 - CARD_HEIGHT_RATIO) * 50)보다 위쪽에 둬 바닥 여유를 확보한다.
const CARD_TOP_PERCENT = 6;

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
        className="absolute top-3 left-1/2 rounded-full"
        style={{
          width: DIAL_RADIUS_PX * 2,
          height: DIAL_RADIUS_PX * 2,
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
              className="absolute top-0 left-1/2 bg-gray-400"
              style={{
                height: isMajor ? 14 : 9,
                width: isMajor ? 2 : 1,
                transformOrigin: `50% ${DIAL_RADIUS_PX}px`,
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
  const [stageWidth, setStageWidth] = useState(360);

  // 무대 너비에 맞춰 카드 간격(드래그 민감도)과 카드 회전 반지름을 반응형으로 계산한다.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const update = () => {
      const width = stage.clientWidth;
      setSpacing(Math.max(140, Math.min(width * 0.42, 240)));
      setStageWidth(width);
    };
    update();

    const observer = new ResizeObserver(update);
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  // delta=1 카드 상단의 수평 이동량 ≈ 반지름 × sin(각도) 이 스테이지 폭 ×
  // CARD_EDGE_SHIFT_RATIO 가 되도록 역산한 카드 전용 회전 반지름.
  const cardRingRadiusPx =
    (stageWidth * CARD_EDGE_SHIFT_RATIO) /
    Math.sin((DIAL_ANGLE_PER_CARD * Math.PI) / 180);

  const handleCardPointerDown = useCallback(
    (event: React.PointerEvent) => {
      // 링크(결과 상세 이동) 위에서 시작한 포인터는 드래그로 잡지 않는다.
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
            // 다이얼 눈금과 동일한 원 위의 슬롯 각도 — 원 하나를 통째로 쓰는 물리 모델.
            const cardAngle = delta * DIAL_ANGLE_PER_CARD;
            const transition = isDragging
              ? "none"
              : "transform 0.45s cubic-bezier(0.22,1,0.36,1), opacity 0.45s ease";

            return (
              <div
                key={moodboard.id}
                className="absolute left-1/2 aspect-[3/4]"
                style={{
                  top: `${CARD_TOP_PERCENT}%`,
                  height: `${CARD_HEIGHT_RATIO * 100}%`,
                  transformOrigin: `50% ${cardRingRadiusPx}px`,
                  transform: `translateX(-50%) rotate(${cardAngle}deg)`,
                  zIndex: 100 - Math.round(distance * 10),
                  transition,
                  pointerEvents: isActive ? "auto" : "none",
                }}
                aria-hidden={!isActive}
              >
                {/* 슬롯 각도의 일부만 되돌려 세운다 — 중앙 카드는 똑바로, 옆 카드는 살짝 기울어지게. */}
                <div
                  className="h-full w-full"
                  style={{
                    transform: `rotate(${-cardAngle * CARD_TILT_CORRECTION_RATIO}deg)`,
                    opacity: 1 - clamped * 0.4,
                    transition,
                  }}
                >
                  <div className="relative h-full w-full overflow-hidden rounded-sm bg-surface-sunken shadow-card">
                    <MoodboardImage moodboard={moodboard} />
                    {moodboard.isGuest ? (
                      <span className="absolute top-3 left-3 rounded-full bg-surface-inverse/80 px-2 py-1 font-semibold text-white text-caption">
                        임시
                      </span>
                    ) : null}
                    {/* 카드 전체 탭 → 무드보드 상세(결과물) 페이지 */}
                    {isActive ? (
                      <Link
                        href={`/moodboard/${moodboard.id}`}
                        aria-label={`${moodboard.typeName} 결과 보기`}
                        className="absolute inset-0"
                      >
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent p-4 pt-10">
                          <p className="line-clamp-1 font-semibold text-white/90 text-body-sm">
                            {moodboard.typeName}
                          </p>
                        </div>
                      </Link>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
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
