"use client";

import Image from "next/image";

import { CARDS, TRANSITIONS } from "@/lib/mood-test/seed";

// E. 최종 대결 — 확신(카드) 5장 + 열망(전환 선택) 3개 혼합 그리드.
const CARD_MAP = new Map(CARDS.map((card) => [card.id, card]));
const TRANSITION_MAP = new Map(TRANSITIONS.map((t) => [t.id, t]));

type Props = {
  poolIds: string[];
  selectedIds: string[];
  atCapacity: boolean;
  onToggle: (id: string) => void;
};

export default function FinalGrid({
  poolIds,
  selectedIds,
  atCapacity,
  onToggle,
}: Props) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {poolIds.map((id) => {
        const card = CARD_MAP.get(id);
        const transition = card ? undefined : TRANSITION_MAP.get(id);
        const label = card?.label ?? transition?.label ?? id;
        const selected = selectedIds.includes(id);
        const disabled = !selected && atCapacity;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onToggle(id)}
            disabled={disabled}
            aria-pressed={selected}
            className={`relative flex aspect-square items-center justify-center overflow-hidden rounded-lg border p-1 text-center text-[11px] transition ${
              selected
                ? "border-neutral-900 ring-2 ring-neutral-900"
                : "border-neutral-300"
            } ${disabled ? "opacity-40" : ""} ${
              card ? "" : "bg-neutral-100 text-neutral-600"
            }`}
          >
            {card ? (
              <>
                <Image
                  src={card.imagePath}
                  alt={card.label}
                  fill
                  sizes="25vw"
                  className="object-cover"
                />
                <span className="relative z-10 w-full truncate rounded bg-black/50 px-1 py-0.5 text-white">
                  {label}
                </span>
              </>
            ) : (
              <span>{label}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
