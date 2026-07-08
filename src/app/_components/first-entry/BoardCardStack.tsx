"use client";

import { motion } from "framer-motion";
import Image from "next/image";

// 첫진입 화면의 흩뿌려진 이미지 카드 무리. entry 페이즈에 상단에서 스프링으로 떨어져
// 기울어진 채 자리를 잡고(디자인 시안), 세로 스와이프/스크롤로 넘겨볼 수 있다.
// 카드는 네이티브 세로 스크롤 컨테이너 안에 놓여 터치·휠·드래그 모두로 넘어간다.
// (지금은 목업 콜라주 1장을 모든 카드에 채운다 — 추후 실제 결과물 썸네일로 교체 예정)

type Props = {
  active: boolean;
  reduced: boolean;
};

const MOCKUP_SRC = "/assets/image.png";

// top 은 스크롤 캔버스(세로로 뷰포트보다 김) 기준 vh, left/width 는 프레임 대비 %.
const CARDS = [
  { top: "3vh", left: "6%", width: "58%", rotate: -6 },
  { top: "23vh", left: "38%", width: "56%", rotate: 5 },
  { top: "45vh", left: "-4%", width: "62%", rotate: 4 },
  { top: "69vh", left: "40%", width: "54%", rotate: -5 },
  { top: "92vh", left: "3%", width: "60%", rotate: -8 },
  { top: "116vh", left: "37%", width: "56%", rotate: 3 },
] as const;

export default function BoardCardStack({ active, reduced }: Props) {
  return (
    <div
      className="absolute inset-0 z-10 [scrollbar-width:none] overflow-y-auto overscroll-contain [&::-webkit-scrollbar]:hidden"
      aria-label="무드보드 예시 이미지 — 위아래로 넘겨보세요"
    >
      {/* 세로로 뷰포트보다 긴 캔버스 → 스크롤 발생 */}
      <div className="relative h-[168vh] w-full">
        {active &&
          CARDS.map((card, index) => (
            <motion.div
              key={index}
              className="absolute overflow-hidden rounded-[var(--radius-lg)] bg-gray-100 shadow-card"
              style={{
                top: card.top,
                left: card.left,
                width: card.width,
                aspectRatio: "1720 / 2552",
              }}
              initial={
                reduced
                  ? { opacity: 0, rotate: card.rotate }
                  : { opacity: 0, y: "-72vh", rotate: 0 }
              }
              animate={{ opacity: 1, y: 0, rotate: card.rotate }}
              transition={
                reduced
                  ? { duration: 0.3, delay: index * 0.04 }
                  : {
                      type: "spring",
                      stiffness: 88,
                      damping: 15,
                      mass: 0.9,
                      delay: index * 0.11,
                    }
              }
            >
              <Image
                src={MOCKUP_SRC}
                alt=""
                fill
                sizes="(max-width: 430px) 60vw, 258px"
                className="object-cover"
                style={{
                  objectPosition: `50% ${(index * 18) % 100}%`,
                }}
                priority={index < 2}
              />
            </motion.div>
          ))}
      </div>
    </div>
  );
}
