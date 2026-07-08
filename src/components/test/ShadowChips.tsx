"use client";

import type { Shadow } from "@/lib/mood-test/seed";

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
    <div className="grid grid-cols-2 gap-2">
      {shadows.map((shadow) => {
        const selected = selectedIds.includes(shadow.id);
        const disabled = !selected && atCapacity;
        return (
          <button
            key={shadow.id}
            type="button"
            onClick={() => onToggle(shadow.id)}
            disabled={disabled}
            aria-pressed={selected}
            className={`rounded-full border px-4 py-3 text-sm transition ${
              selected
                ? "border-neutral-900 bg-neutral-900 text-white"
                : "border-neutral-300 bg-neutral-100 text-neutral-600"
            } ${disabled ? "opacity-40" : ""}`}
          >
            {shadow.label}
          </button>
        );
      })}
    </div>
  );
}
