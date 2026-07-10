"use client";

import { motion } from "framer-motion";

import type { Transition } from "@/lib/mood-test/seed";

// D. 전환 — 프로토타입(step4)의 "유기적 도형 중 하나 고르기". 뻔한 반대말 1 + 결이 다른 해석 3을
// 네 개의 clip-path 블롭으로 흩뿌리고, 고르면 보라 그라디언트로 차오르며 핑크 글로우가 번진다.
// 단일 선택(pick)이라 상태 기계의 PICK 을 그대로 쓴다.

// 별/스캘럽처럼 둘레가 물결치는 clip-path 를 각도별 반지름으로 만든다.
function bumpPath(bumps: number, inner: number, outer: number): string {
  const points: string[] = [];
  const total = bumps * 2;
  for (let i = 0; i < total; i += 1) {
    const angle = (Math.PI * 2 * i) / total - Math.PI / 2;
    const r = i % 2 === 0 ? outer : inner;
    const x = 50 + r * Math.cos(angle);
    const y = 50 + r * Math.sin(angle);
    points.push(`${x.toFixed(1)}% ${y.toFixed(1)}%`);
  }
  return `polygon(${points.join(",")})`;
}

// 선택지 인덱스별 도형: 버스트 → 스캘럽 → 오각형 → 육각 블롭 순환.
const CLIPS = [
  bumpPath(10, 34, 46),
  bumpPath(8, 38, 47),
  "polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)",
  "polygon(22% 4%, 78% 0%, 100% 42%, 88% 92%, 38% 100%, 0% 58%)",
];
// 짝수/홀수로 위아래 엇갈린 배치 — 두 열이 지그재그로 떠 있는 느낌.
const NUDGES = ["mt-0", "mt-10", "mt-6", "mt-16"];

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
    <div className="grid grid-cols-2 place-items-center gap-x-4 gap-y-2 py-2">
      {choices.map((choice, index) => {
        const selected = choice.id === pickedId;
        return (
          <motion.button
            key={choice.id}
            type="button"
            onClick={() => onPick(choice.id)}
            aria-pressed={selected}
            whileTap={{ scale: 0.95 }}
            animate={{ scale: selected ? 1.06 : 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 22 }}
            style={{
              filter: selected
                ? "drop-shadow(0 0 18px rgba(255,79,163,0.5))"
                : "drop-shadow(0 6px 12px rgba(84,64,56,0.12))",
            }}
            className={`relative aspect-square w-[9.5rem] max-w-full cursor-pointer outline-none ${NUDGES[index % NUDGES.length]}`}
          >
            <span
              aria-hidden
              style={{ clipPath: CLIPS[index % CLIPS.length] }}
              className={`absolute inset-0 transition-colors duration-300 ${
                selected
                  ? "bg-[image:var(--gradient-violet-soft)]"
                  : "bg-surface-sunken"
              }`}
            />
            <span className="absolute inset-0 flex items-center justify-center px-6 text-center font-medium text-foreground text-body-sm">
              {choice.label}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
