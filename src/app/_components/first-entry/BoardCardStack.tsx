"use client";

import {
  motion,
  type MotionValue,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import Image from "next/image";
import { useEffect, useRef } from "react";

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
  /** 첫 화면에 걸리는 카드 이미지가 모두 준비되면 한 번 호출된다 — 스플래시 종료 조건. */
  onAboveFoldReady?: () => void;
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

// 낙하가 시작되기 전 카드가 대기하는 위치(화면 위 바깥).
const DROP_FROM_Y = "-72vh";

// 첫 화면에 걸리는 카드 수. 이 세 장은 스플래시 동안 미리 받아둔다 — 나머지는 스크롤해야 나온다.
const ABOVE_FOLD_CARDS = 3;

type Card = (typeof CARDS)[number];
type BoardArcCardProps = {
  active: boolean;
  card: Card;
  index: number;
  scrollYProgress: MotionValue<number>;
};

// 첫 화면 카드 이미지가 화면에 그릴 준비까지 끝났는지 본다. next/image 의 onLoad 는 쓰지 않는다 —
// onError 를 함께 넘기면 하이드레이션 때 img.src 를 자기 자신으로 재대입해 이미지를 두 번 받고,
// 하이드레이션 전에 이미 로드가 끝난 이미지는 콜백이 유실된다.
function whenPainted(img: HTMLImageElement): Promise<void> {
  const loaded = img.complete
    ? Promise.resolve()
    : new Promise<void>((resolve) => {
        img.addEventListener("load", () => resolve(), { once: true });
        img.addEventListener("error", () => resolve(), { once: true });
      });

  // decode() 까지 기다려야 낙하 첫 프레임에서 디코딩이 메인 스레드를 물지 않는다.
  // 실패해도 준비된 것으로 친다 — 한 장이 못 오더라도 스플래시가 붙잡혀선 안 된다.
  return loaded.then(() => img.decode().catch(() => {}));
}

export default function BoardCardStack({ active, onAboveFoldReady }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ container: scrollRef });

  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;

    let isActive = true;
    const images = Array.from(root.querySelectorAll("img")).slice(
      0,
      ABOVE_FOLD_CARDS,
    );

    void Promise.all(images.map(whenPainted)).then(() => {
      if (isActive) onAboveFoldReady?.();
    });

    return () => {
      isActive = false;
    };
  }, [onAboveFoldReady]);

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
        {/* 스플래시 동안에도 마운트해 둔다 — 카드가 낙하하는 순간에 처음 마운트되면 그때부터
            이미지를 받고 디코딩하느라 스프링 첫 프레임이 굶어 뚝 끊긴 뒤 떨어진다. */}
        {CARDS.map((card, index) => (
          <BoardArcCard
            key={index}
            active={active}
            card={card}
            index={index}
            scrollYProgress={scrollYProgress}
          />
        ))}
      </div>
    </div>
  );
}

function BoardArcCard({
  active,
  card,
  index,
  scrollYProgress,
}: BoardArcCardProps) {
  const rawX = useTransform(
    scrollYProgress,
    ARC_CATCH_POINTS.map((point) => card.arcPeak + point),
    ARC_X,
  );
  const x = useSpring(rawX, { stiffness: 420, damping: 31, mass: 0.38 });
  const rawRotateY = useTransform(
    scrollYProgress,
    ARC_CATCH_POINTS.map((point) => card.arcPeak + point),
    [
      card.rotateY,
      card.rotateY * 0.62,
      card.rotateY * 0.22,
      card.rotateY * 0.08,
      card.rotateY * 0.18,
      card.rotateY * 0.62,
      card.rotateY,
    ],
  );
  const rotateY = useSpring(rawRotateY, {
    stiffness: 360,
    damping: 34,
    mass: 0.32,
  });

  // 대기 상태 = initial 과 같은 값이라, 스플래시 동안 마운트돼도 아무 동작이 일어나지 않는다.
  const waiting = { opacity: 0, y: DROP_FROM_Y, rotate: 0 };

  return (
    <motion.div
      // 스플래시 동안에는 화면 밖에서 이미지만 받아둔다 — 보조기술에는 노출하지 않는다.
      aria-hidden={!active}
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
      initial={waiting}
      animate={active ? { opacity: 1, y: 0, rotate: card.rotate } : waiting}
      transition={{
        type: "spring",
        stiffness: 88,
        damping: 15,
        mass: 0.9,
        delay: index * 0.12,
      }}
    >
      <Image
        src={card.src}
        alt={card.alt}
        fill
        sizes="(max-width: 430px) 64vw, 275px"
        className="object-cover"
        // 낙하 전에는 세 장 모두 뷰포트 밖이라 lazy 면 로딩이 시작조차 안 된다 —
        // 첫 화면에 걸리는 카드는 eager 로 받아 스플래시가 끝나기 전에 디코딩까지 끝낸다.
        priority={index < ABOVE_FOLD_CARDS}
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
