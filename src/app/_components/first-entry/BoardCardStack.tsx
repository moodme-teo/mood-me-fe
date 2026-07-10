"use client";

import {
  motion,
  type MotionValue,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import Image from "next/image";
import { useRef } from "react";

// 첫진입 화면의 이미지 카드 무리. 한 줄(단일 세로 컬럼)로 쌓여 위→아래로 스와이프/스크롤한다.
// 각 카드는 화면 밖 왼쪽에 중심을 둔 큰 원의 오른쪽 곡면을 따라 움직이는 듯
// 스크롤 위치에 맞춰 x 축과 rotateY 를 함께 바꾼다. Board 글자에 가까워지는 지점에
// 작은 되감김을 넣어 카드가 글자에 잠깐 걸렸다가 풀리는 듯한 감각을 만든다.
// 화면 중앙에 가까울수록 평면에 가깝고, 바깥으로 갈수록 다시 깊은 3D 각도를 갖는다.
// entry 페이즈에 상단에서 스프링으로 떨어져 자리잡는다.
//
// 카드 5장은 서로 다른 페르소나·레이아웃으로 뽑은 실제 보드 예시다 — "사람마다 다른 보드가
// 나온다"를 첫 화면에서 바로 보여준다(PRODUCT.md). 한 번에 3장쯤 보이고 나머지는 아래로
// 스크롤해야 나온다. 재생성: `pnpm mockup:boards` (scripts/generate-mockup-boards.ts).

type Props = {
  active: boolean;
  reduced: boolean;
};

// 한 줄 세로 배치 — left/width 는 동일(살짝 겹치며 아래로), top 은 스크롤 캔버스 기준 vh.
// rotateY 는 카드가 화면 바깥으로 갈 때의 왼쪽 축 기준 최대 회전각, rotate 는 평면 기울기다.
// arcPeak 는 카드가 원호의 안쪽(오른쪽)으로 가장 들어오는 scrollYProgress 지점이다.
const CARDS = [
  {
    src: "/assets/first-entry/coastal-cyan-a.jpg",
    alt: "여행하는 삶의 무드보드 예시 — 바닷마을 산책과 여권, 러닝 스냅을 여백 없이 이어 붙인 콜라주",
    top: "3vh",
    rotateY: -17,
    rotate: -5.5,
    arcPeak: -0.28,
  },
  {
    src: "/assets/first-entry/warm-cream-a.jpg",
    alt: "포근한 집의 무드보드 예시 — 코르크 게시판에 들꽃 사진과 손글씨 메모를 압정으로 듬성듬성 꽂아둔 콜라주",
    top: "33vh",
    rotateY: -13,
    rotate: 3.5,
    arcPeak: 0.02,
  },
  {
    src: "/assets/first-entry/dreamy-violet.jpg",
    alt: "몽환적인 무드보드 예시 — 초승달과 나비, 별밤 사진을 모양대로 오려 붙이고 가운데 큰 타이틀을 얹은 콜라주",
    top: "63vh",
    rotateY: -16,
    rotate: -1.5,
    arcPeak: 0.42,
  },
  {
    src: "/assets/first-entry/coastal-cyan-b.jpg",
    alt: "시원한 바다의 무드보드 예시 — 파도와 데이지, 여권과 운동화 사진을 크게 맞물려 붙인 콜라주",
    top: "93vh",
    rotateY: -12,
    rotate: 6,
    arcPeak: 0.86,
  },
  {
    src: "/assets/first-entry/warm-cream-b.jpg",
    alt: "느긋한 일상의 무드보드 예시 — 게시판에 정원 사진과 금색 액자, 달걀 바구니를 붙여둔 콜라주",
    top: "123vh",
    rotateY: -18,
    rotate: -8,
    arcPeak: 1.22,
  },
] as const;

const CARD_LEFT = "14%";
const CARD_WIDTH = "42%";
const ARC_SPAN = 0.34;
const ARC_CATCH_POINTS = [-ARC_SPAN, -0.1, -0.03, 0, 0.04, 0.12, ARC_SPAN];
// 원호의 가로 이동폭. translateX 의 % 는 카드 자기 너비 기준이다 — 뷰포트(vw)를 쓰면
// 앱 셸이 max-w-[430px] 로 고정돼 있는 넓은 화면에서 카드가 컬럼 밖으로 밀려 잘린다.
// 카드 너비 = 컨테이너의 42% 이므로, 컨테이너 폭 기준 14% 는 카드 너비의 33.33% 다.
const ARC_X = [
  "-33.33%",
  "-7.14%",
  "14.29%",
  "9.52%",
  "19.05%",
  "10.71%",
  "-33.33%",
];
const ARC_X_REDUCED = [
  "-14.29%",
  "-4.76%",
  "5.95%",
  "3.57%",
  "7.14%",
  "4.76%",
  "-14.29%",
];

type Card = (typeof CARDS)[number];
type BoardArcCardProps = {
  card: Card;
  index: number;
  reduced: boolean;
  scrollYProgress: MotionValue<number>;
};

export default function BoardCardStack({ active, reduced }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ container: scrollRef });

  return (
    <div
      ref={scrollRef}
      className="absolute inset-0 z-10 [scrollbar-width:none] overflow-y-auto overscroll-contain [&::-webkit-scrollbar]:hidden"
      aria-label="무드보드 예시 이미지 — 위아래로 넘겨보세요"
    >
      {/* 세로로 뷰포트보다 긴 캔버스 + 원근(perspective) 컨텍스트 → rotateY 가 입체로 보인다 */}
      <div
        className="relative h-[168vh] w-full"
        style={{ perspective: "1500px", perspectiveOrigin: "left center" }}
      >
        {active &&
          CARDS.map((card, index) => (
            <BoardArcCard
              key={index}
              card={card}
              index={index}
              reduced={reduced}
              scrollYProgress={scrollYProgress}
            />
          ))}
      </div>
    </div>
  );
}

function BoardArcCard({
  card,
  index,
  reduced,
  scrollYProgress,
}: BoardArcCardProps) {
  const rawX = useTransform(
    scrollYProgress,
    ARC_CATCH_POINTS.map((point) => card.arcPeak + point),
    reduced ? ARC_X_REDUCED : ARC_X,
  );
  const x = useSpring(rawX, {
    stiffness: reduced ? 900 : 420,
    damping: reduced ? 90 : 31,
    mass: reduced ? 0.2 : 0.38,
  });
  const rotateYRange = reduced
    ? [
        card.rotateY * 0.45,
        card.rotateY * 0.32,
        card.rotateY * 0.16,
        card.rotateY * 0.08,
        card.rotateY * 0.14,
        card.rotateY * 0.32,
        card.rotateY * 0.45,
      ]
    : [
        card.rotateY,
        card.rotateY * 0.62,
        card.rotateY * 0.22,
        card.rotateY * 0.08,
        card.rotateY * 0.18,
        card.rotateY * 0.62,
        card.rotateY,
      ];
  const rawRotateY = useTransform(
    scrollYProgress,
    ARC_CATCH_POINTS.map((point) => card.arcPeak + point),
    rotateYRange,
  );
  const rotateY = useSpring(rawRotateY, {
    stiffness: reduced ? 900 : 360,
    damping: reduced ? 90 : 34,
    mass: reduced ? 0.2 : 0.32,
  });

  return (
    <motion.div
      className="absolute overflow-hidden rounded-sm bg-gray-100 shadow-card"
      style={{
        x,
        rotateY,
        top: card.top,
        left: CARD_LEFT,
        width: CARD_WIDTH,
        aspectRatio: "1024 / 1536", // 보드 출력 고정 비율(2:3) — 잘림 없이 한 장이 다 보인다
        transformOrigin: "left center",
      }}
      initial={
        reduced
          ? { opacity: 0, rotate: card.rotate }
          : { opacity: 0, y: "-72vh", rotate: 0 }
      }
      animate={{
        opacity: 1,
        y: 0,
        rotate: card.rotate,
      }}
      transition={
        reduced
          ? { duration: 0.3, delay: index * 0.04 }
          : {
              type: "spring",
              stiffness: 88,
              damping: 15,
              mass: 0.9,
              delay: index * 0.12,
            }
      }
    >
      <Image
        src={card.src}
        alt={card.alt}
        fill
        sizes="(max-width: 430px) 64vw, 275px"
        className="object-cover"
        priority={index < 2}
      />
      {/* 오른쪽으로 물러난 면에 옅은 음영 — 3D 입체감 강조 */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, transparent 55%, rgba(30,25,50,0.16))",
        }}
      />
    </motion.div>
  );
}
