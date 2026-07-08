"use client";

import Image from "next/image";

import type { Card } from "@/lib/mood-test/seed";

type Props = {
  cards: Card[];
  selectedIds: string[];
  atCapacity: boolean;
  onToggle: (id: string) => void;
};

export default function CardGrid({
  cards,
  selectedIds,
  atCapacity,
  onToggle,
}: Props) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {cards.map((card) => {
        const selected = selectedIds.includes(card.id);
        const disabled = !selected && atCapacity;
        return (
          <button
            key={card.id}
            type="button"
            onClick={() => onToggle(card.id)}
            disabled={disabled}
            aria-pressed={selected}
            className={`relative flex aspect-square items-end overflow-hidden rounded-lg border p-1 text-center text-xs transition ${
              selected
                ? "border-neutral-900 ring-2 ring-neutral-900"
                : "border-neutral-300"
            } ${disabled ? "opacity-40" : ""}`}
          >
            <Image
              src={card.imagePath}
              alt={card.label}
              fill
              sizes="(max-width: 480px) 30vw, 160px"
              className="object-cover"
            />
            <span className="relative z-10 w-full truncate rounded bg-black/50 px-1 py-0.5 text-white">
              {card.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
