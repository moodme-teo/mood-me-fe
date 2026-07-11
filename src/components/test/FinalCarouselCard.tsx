"use client";

import {
  motion,
  type PanInfo,
  useDragControls,
  useIsPresent,
} from "framer-motion";
import Image from "next/image";

// E(최종 대결) 대각선 캐러셀의 카드 한 장. 포커스(distance === 0)일 때만 드래그가 켜진다 —
// 우측 하단(45도)으로 끌어 임계값을 넘기면 탈락(onReject). 카드가 배치된 대각선 축
// (STEP_X, STEP_Y — 우상단↔좌하단) 방향으로 끌면 반대편 끝에 있는 카드가 중앙으로
// 온다 — 우상단으로 끌면 좌하단(왼쪽) 카드가, 좌하단으로 끌면 우상단(오른쪽) 카드가
// 당겨져 온다(onSwipe). 두 제스처는 드래그 벡터를 각 방향의 단위 벡터에 투영해 어느
// 쪽으로 더 많이 끌렸는지로 구분한다.
// 실제 스와이프는 짧고 빠른 플릭인 경우가 많아 이동 거리만 보면 잘 안 걸린다 — 거리
// 임계값 또는 속도(velocity) 임계값 중 하나만 넘어도 인정한다(둘 다 기준 미달이면 원위치로
// 스냅백, dragSnapToOrigin — DiscardStack.tsx의 폐기 제스처와 같은 결).
const REJECT_DISTANCE = 80;
const REJECT_VELOCITY = 650;
const SWIPE_DISTANCE = 40;
const SWIPE_VELOCITY = 500;
const STEP_X = 46;
const STEP_Y = -72;

function normalize(x: number, y: number): [number, number] {
  const length = Math.hypot(x, y) || 1;
  return [x / length, y / length];
}

// 카드 배치 축(STEP_X, STEP_Y)의 우상단 방향 단위 벡터.
const [TOP_RIGHT_X, TOP_RIGHT_Y] = normalize(STEP_X, STEP_Y);
// 탈락 방향 단위 벡터 — 우측 하단 45도.
const [REJECT_X, REJECT_Y] = normalize(1, 1);

type Props = {
  label: string;
  imagePath?: string;
  distance: number;
  isFocused: boolean;
  onFocus: () => void;
  onSwipe: (direction: "prev" | "next") => void;
  onReject: () => void;
};

export default function FinalCarouselCard({
  label,
  imagePath,
  distance,
  isFocused,
  onFocus,
  onSwipe,
  onReject,
}: Props) {
  const controls = useDragControls();
  // 탈락한 카드는 exit 애니메이션 동안에도 AnimatePresence가 마운트를 유지한다 — 그때의
  // props(isFocused=true 등)가 그대로 남아 있어서 손대지 않으면 화면 밖으로 날아가는
  // "유령" 카드가 포커스·드래그·클릭을 계속 가로챈다(다음 스와이프가 씹히는 원인).
  // useIsPresent로 exit 중임을 감지해 상호작용을 전부 꺼서 아래 카드로 흘려보낸다.
  const isPresent = useIsPresent();
  const isInteractive = isPresent;
  const draggable = isFocused && isInteractive;

  const scale = Math.max(1 - Math.abs(distance) * 0.13, 0.42);
  const opacity = Math.max(1 - Math.abs(distance) * 0.32, 0);
  const zIndex = 100 - Math.abs(distance);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const { offset, velocity } = info;
    const project = (x: number, y: number) => offset.x * x + offset.y * y;
    const projectVelocity = (x: number, y: number) =>
      velocity.x * x + velocity.y * y;

    const rejectProjection = project(REJECT_X, REJECT_Y);
    const topRightProjection = project(TOP_RIGHT_X, TOP_RIGHT_Y);
    const bottomLeftProjection = -topRightProjection;

    const rejectTriggered =
      rejectProjection > 0 &&
      (rejectProjection > REJECT_DISTANCE ||
        projectVelocity(REJECT_X, REJECT_Y) > REJECT_VELOCITY);
    const topRightTriggered =
      topRightProjection > 0 &&
      (topRightProjection > SWIPE_DISTANCE ||
        projectVelocity(TOP_RIGHT_X, TOP_RIGHT_Y) > SWIPE_VELOCITY);
    const bottomLeftTriggered =
      bottomLeftProjection > 0 &&
      (bottomLeftProjection > SWIPE_DISTANCE ||
        projectVelocity(-TOP_RIGHT_X, -TOP_RIGHT_Y) > SWIPE_VELOCITY);

    if (
      rejectTriggered &&
      rejectProjection >= topRightProjection &&
      rejectProjection >= bottomLeftProjection
    ) {
      onReject();
      return;
    }
    // 우상단으로 끌면 좌하단(왼쪽) 카드가, 좌하단으로 끌면 우상단(오른쪽) 카드가 온다 —
    // 카드가 실제로 앉아 있는 방향과는 반대로 당겨서 그 카드를 "끌어오는" 제스처.
    if (topRightTriggered && topRightProjection >= bottomLeftProjection) {
      onSwipe("prev");
      return;
    }
    if (bottomLeftTriggered) {
      onSwipe("next");
    }
  };

  return (
    <motion.div
      role={!isInteractive ? undefined : isFocused ? "group" : "button"}
      aria-roledescription={
        isInteractive && isFocused ? "포커스된 카드" : undefined
      }
      aria-label={
        isInteractive
          ? isFocused
            ? label
            : `${label} 포커스로 가져오기`
          : undefined
      }
      aria-hidden={!isInteractive || undefined}
      tabIndex={isInteractive && !isFocused ? 0 : -1}
      onClick={isInteractive && !isFocused ? onFocus : undefined}
      onKeyDown={
        isInteractive && !isFocused
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onFocus();
              }
            }
          : undefined
      }
      initial={false}
      animate={{
        x: distance * STEP_X,
        y: distance * STEP_Y,
        scale,
        opacity,
      }}
      exit={{ x: 480, y: 480, opacity: 0, rotate: 16 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      drag={draggable}
      dragControls={controls}
      dragListener={false}
      dragSnapToOrigin
      dragElastic={0.6}
      dragMomentum={false}
      whileDrag={{ cursor: "grabbing" }}
      onPointerDown={(event) => {
        if (draggable) controls.start(event);
      }}
      onDragEnd={handleDragEnd}
      style={{ zIndex: isInteractive ? zIndex : -1, touchAction: "none" }}
      className={`absolute top-1/2 left-1/2 flex aspect-[3/4] w-[148px] -translate-x-1/2 -translate-y-1/2 items-center justify-center overflow-hidden rounded-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50 ${
        !isInteractive || opacity <= 0.04 ? "pointer-events-none" : ""
      } ${
        isFocused
          ? "cursor-grab shadow-card active:cursor-grabbing"
          : "cursor-pointer shadow-card"
      } ${imagePath ? "bg-background" : "bg-white"}`}
    >
      {imagePath && (
        <Image
          src={imagePath}
          alt=""
          fill
          sizes="148px"
          className="pointer-events-none object-cover"
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
}
