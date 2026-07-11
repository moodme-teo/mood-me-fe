"use client";

import { motion } from "framer-motion";

import type { Shadow } from "@/lib/mood-test/seed";

// C. 그림자 — 프로토타입의 "엇갈려 흩뿌린 알약" 레이아웃. 세로로 쌓되 좌우 오프셋을 번갈아 줘
// 딱딱한 목록이 아니라 마음속 조각이 떠다니는 느낌을 낸다. 선택은 상태 기계의 toggle 을 그대로 쓴다.
const OFFSETS = [0, 44, 12, 52, 20, 40, 8];

type Props = {
  shadows: Shadow[];
  selectedIds: string[];
  atCapacity: boolean;
  onToggle: (id: string) => void;
};

export default function ShadowChips({
  shadows,
  selectedIds,
  atCapacity,
  onToggle,
}: Props) {
  return (
    <div className="flex flex-col items-center gap-3.5 py-4">
      {shadows.map((shadow, index) => {
        const selected = selectedIds.includes(shadow.id);
        const disabled = !selected && atCapacity;
        return (
          <motion.button
            key={shadow.id}
            type="button"
            onClick={() => onToggle(shadow.id)}
            disabled={disabled}
            aria-pressed={selected}
            animate={{
              boxShadow: selected
                ? "inset 0 12px 6px rgba(84, 64, 56, 0.6), inset 0 16px 32px rgba(84, 64, 56, 0.4)"
                : "inset 0 3px 6px rgba(84, 64, 56, 0.1), inset 0 6px 16px rgba(84, 64, 56, 0.2)",
            }}
            transition={{ type: "spring", stiffness: 320, damping: 24 }}
            style={{ marginLeft: OFFSETS[index % OFFSETS.length] }}
            className={`rounded-pill border bg-background px-10 py-3.5 whitespace-nowrap outline-none text-body-sm focus-visible:ring-3 focus-visible:ring-ring/50 ${
              selected
                ? "bg-surface-card font-semibold text-foreground"
                : "font-medium text-muted-foreground"
            } ${disabled ? "cursor-default" : "cursor-pointer"}`}
          >
            {shadow.label}
          </motion.button>
        );
      })}
    </div>
  );
}
