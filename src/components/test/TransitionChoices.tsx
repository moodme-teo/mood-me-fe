"use client";

import { motion } from "framer-motion";

import type { Transition } from "@/lib/mood-test/seed";

// D. 전환 — 프로토타입(step4)의 "유기적 도형 중 하나 고르기". 뻔한 반대말 1 + 결이 다른 해석 3을
// 네 개의 clip-path 블롭으로 흩뿌리고, 고르면 보라 그라디언트로 차오르며 핑크 글로우가 번진다.
// 단일 선택(pick)이라 상태 기계의 PICK 을 그대로 쓴다.

// public/도형/Star 4~7.svg 의 path 를 그대로 옮긴 것. clip-path 대신 실제 <path> 를 그려서
// fill/stroke/이너쉐도우 애니메이션이 사각 버튼 박스가 아니라 별 윤곽선을 그대로 따라가게 한다.
const STAR_SHAPES = [
  {
    id: "star-4",
    width: 202,
    height: 202,
    d: "M88.0742 5.1582C95.3625 -1.05282 106.083 -1.05282 113.371 5.1582L128.229 17.8193C131.512 20.6174 135.594 22.3092 139.895 22.6523L159.354 24.2051C168.899 24.9668 176.478 32.5464 177.24 42.0918L178.793 61.5508C179.136 65.851 180.828 69.9334 183.626 73.2168L196.287 88.0742C202.498 95.3625 202.498 106.083 196.287 113.371L183.626 128.229C180.828 131.512 179.136 135.594 178.793 139.895L177.24 159.354C176.478 168.899 168.899 176.478 159.354 177.24L139.895 178.793C135.594 179.136 131.512 180.828 128.229 183.626L113.371 196.287C106.083 202.498 95.3625 202.498 88.0742 196.287L73.2168 183.626C69.9334 180.828 65.851 179.136 61.5508 178.793L42.0918 177.24C32.5464 176.478 24.9668 168.899 24.2051 159.354L22.6523 139.895C22.3092 135.594 20.6174 131.512 17.8193 128.229L5.1582 113.371C-1.05282 106.083 -1.05282 95.3625 5.1582 88.0742L17.8193 73.2168C20.6174 69.9334 22.3092 65.851 22.6523 61.5508L24.2051 42.0918C24.9669 32.5464 32.5464 24.9668 42.0918 24.2051L61.5508 22.6523C65.851 22.3092 69.9334 20.6174 73.2168 17.8193L88.0742 5.1582Z",
  },
  {
    id: "star-5",
    width: 192,
    height: 190,
    d: "M82.7246 5.55859C90.158 -1.1856 101.496 -1.1856 108.93 5.55859L117.897 13.6943C121.872 17.3003 127.102 19.2036 132.465 18.9961L144.564 18.5283C154.594 18.1401 163.279 25.4286 164.639 35.373L166.279 47.3691C167.006 52.6864 169.789 57.5068 174.03 60.7949L183.6 68.2139C191.532 74.3632 193.501 85.529 188.15 94.0205L181.695 104.265C178.834 108.805 177.867 114.287 179.003 119.532L181.565 131.366C183.689 141.176 178.02 150.995 168.463 154.061L156.933 157.759C151.822 159.398 147.558 162.976 145.057 167.724L139.413 178.437C134.735 187.316 124.08 191.194 114.788 187.399L103.578 182.821C98.6099 180.792 93.0444 180.792 88.0762 182.821L76.8662 187.399C67.5745 191.194 56.9197 187.316 52.2412 178.437L46.5977 167.724C44.0961 162.976 39.832 159.398 34.7217 157.759L23.1914 154.061C13.6343 150.995 7.96497 141.176 10.0889 131.366L12.6514 119.532C13.787 114.287 12.8201 108.805 9.95898 104.265L3.50391 94.0205C-1.84672 85.529 0.122328 74.3632 8.05469 68.2139L17.624 60.7949C21.8655 57.5068 24.6482 52.6864 25.375 47.3691L27.0156 35.373C28.3749 25.4286 37.0604 18.1401 47.0898 18.5283L59.1895 18.9961C64.552 19.2036 69.7823 17.3003 73.7568 13.6943L82.7246 5.55859Z",
  },
  {
    id: "star-6",
    width: 193,
    height: 199,
    d: "M83.4834 5.25928C90.8109 -1.08643 101.687 -1.08643 109.015 5.25928L170.013 58.0845C173.32 60.9491 175.569 64.8433 176.396 69.1401L191.645 148.378C193.476 157.897 188.038 167.317 178.879 170.49L102.632 196.902C98.4971 198.334 94.0009 198.334 89.8662 196.902L13.6191 170.49C4.4597 167.317 -0.978375 157.897 0.853516 148.378L16.1025 69.1401C16.9295 64.8433 19.1776 60.9491 22.4854 58.0845L83.4834 5.25928Z",
  },
  {
    id: "star-7",
    width: 190,
    height: 187,
    d: "M167.629 162.636C165.784 171.106 158.569 177.341 149.922 177.939L103.899 181.121L103.891 181.121L103.884 181.123L57.9806 185.716C49.3549 186.579 41.1946 181.643 37.9534 173.603L20.7051 130.817L20.7029 130.81L20.6993 130.802L2.14736 88.5659C-1.33894 80.6289 0.833693 71.3431 7.47878 65.776L42.8401 36.1503L42.8519 36.14L77.2886 5.44446C83.7599 -0.323872 93.2625 -1.12811 100.611 3.47142L139.713 27.9474L139.72 27.952L139.727 27.9553L179.562 51.221C187.048 55.5929 190.749 64.3822 188.645 72.7919L177.45 117.545L177.447 117.553L177.446 117.56L167.629 162.636Z",
  },
];
// 짝수/홀수로 위아래 엇갈린 배치 — 두 열이 지그재그로 떠 있는 느낌.
const NUDGES = ["-mt-2", "mt-12", "-mt-12", "mt-8"];

type Props = {
  choices: Transition[];
  pickedId: string | null;
  onPick: (id: string) => void;
};

export default function TransitionChoices({
  choices,
  pickedId,
  onPick,
}: Props) {
  return (
    <div className="grid grid-cols-2 place-items-center">
      <svg width="0" height="0" className="absolute" aria-hidden>
        <defs>
          <radialGradient id="transition-glow" cx="50%" cy="38%" r="65%">
            <stop offset="0%" stopColor="rgba(255,79,163,0.45)" />
            <stop offset="55%" stopColor="rgba(255,79,163,0.15)" />
            <stop offset="100%" stopColor="rgba(255,79,163,0)" />
          </radialGradient>
          {/* 별 안쪽으로 파여 보이는 이너쉐도우 — offset+blur 한 사본을 원본에서 잘라내 도형
              가장자리 안쪽에만 그림자색을 입힌다(2겹: 좁고 진한 겹 + 넓고 옅은 겹). */}
          <filter
            id="transition-shade-idle"
            x="-50%"
            y="-50%"
            width="200%"
            height="200%"
          >
            <feOffset dy="3" in="SourceGraphic" result="off1" />
            <feGaussianBlur in="off1" stdDeviation="3" result="blur1" />
            <feComposite
              operator="out"
              in="SourceGraphic"
              in2="blur1"
              result="inv1"
            />
            <feFlood floodColor="#544038" floodOpacity="0.1" result="color1" />
            <feComposite
              operator="in"
              in="color1"
              in2="inv1"
              result="shadow1"
            />
            <feComposite
              operator="over"
              in="shadow1"
              in2="SourceGraphic"
              result="pass1"
            />
            <feOffset dy="6" in="SourceGraphic" result="off2" />
            <feGaussianBlur in="off2" stdDeviation="8" result="blur2" />
            <feComposite
              operator="out"
              in="SourceGraphic"
              in2="blur2"
              result="inv2"
            />
            <feFlood floodColor="#544038" floodOpacity="0.2" result="color2" />
            <feComposite
              operator="in"
              in="color2"
              in2="inv2"
              result="shadow2"
            />
            <feComposite operator="over" in="shadow2" in2="pass1" />
          </filter>
          <filter
            id="transition-shade-selected"
            x="-50%"
            y="-50%"
            width="200%"
            height="200%"
          >
            <feOffset dy="12" in="SourceGraphic" result="off1" />
            <feGaussianBlur in="off1" stdDeviation="3" result="blur1" />
            <feComposite
              operator="out"
              in="SourceGraphic"
              in2="blur1"
              result="inv1"
            />
            <feFlood floodColor="#544038" floodOpacity="0.6" result="color1" />
            <feComposite
              operator="in"
              in="color1"
              in2="inv1"
              result="shadow1"
            />
            <feComposite
              operator="over"
              in="shadow1"
              in2="SourceGraphic"
              result="pass1"
            />
            <feOffset dy="16" in="SourceGraphic" result="off2" />
            <feGaussianBlur in="off2" stdDeviation="16" result="blur2" />
            <feComposite
              operator="out"
              in="SourceGraphic"
              in2="blur2"
              result="inv2"
            />
            <feFlood floodColor="#544038" floodOpacity="0.4" result="color2" />
            <feComposite
              operator="in"
              in="color2"
              in2="inv2"
              result="shadow2"
            />
            <feComposite operator="over" in="shadow2" in2="pass1" />
          </filter>
        </defs>
      </svg>
      {choices.map((choice, index) => {
        const selected = choice.id === pickedId;
        const star = STAR_SHAPES[index % STAR_SHAPES.length];
        return (
          <motion.button
            key={choice.id}
            type="button"
            onClick={() => onPick(choice.id)}
            aria-pressed={selected}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 22 }}
            className={`relative aspect-square w-[9.5rem] max-w-full cursor-pointer outline-none ${NUDGES[index % NUDGES.length]} ${index % 2 === 1 ? "mr-5" : "ml-5"}`}
          >
            <svg
              viewBox={`0 0 ${star.width} ${star.height}`}
              preserveAspectRatio="none"
              className="absolute inset-0 h-full w-full"
              aria-hidden
            >
              {/* 카드 자체의 입체감 — 항상 불투명한 면에 이너쉐도우를 걸어두고 idle/selected
                  두 강도를 opacity 로 크로스페이드한다. */}
              <motion.path
                d={star.d}
                fill="#f7f4f2"
                filter="url(#transition-shade-idle)"
                initial={false}
                animate={{ opacity: selected ? 0 : 1 }}
                transition={{ duration: 0.25 }}
              />
              <motion.path
                d={star.d}
                fill="#f7f4f2"
                filter="url(#transition-shade-selected)"
                initial={false}
                animate={{ opacity: selected ? 1 : 0 }}
                transition={{ duration: 0.25 }}
              />
              {/* 겉으로 보이는 스킨 — idle 은 옅은 테두리만, selected 는 흰 면 */}
              <motion.path
                d={star.d}
                fill="none"
                strokeWidth={1.5}
                initial={false}
                animate={{
                  fill: selected
                    ? "rgba(255,255,255,1)"
                    : "rgba(255,255,255,0)",
                  stroke: selected ? "rgba(255,255,255,0)" : "#d1d5db",
                }}
                transition={{ duration: 0.3 }}
              />
              {/* 선택 시 번지는 핑크 글로우 */}
              <motion.path
                d={star.d}
                fill="url(#transition-glow)"
                initial={false}
                animate={{ opacity: selected ? 1 : 0 }}
                transition={{ duration: 0.3 }}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center px-6 text-center font-medium text-foreground text-body-sm">
              {choice.label}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
