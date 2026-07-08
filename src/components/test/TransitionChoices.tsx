"use client";

import type { Transition } from "@/lib/mood-test/seed";

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
    <div className="flex flex-col gap-2">
      {choices.map((choice) => {
        const selected = choice.id === pickedId;
        return (
          <button
            key={choice.id}
            type="button"
            onClick={() => onPick(choice.id)}
            aria-pressed={selected}
            className={`rounded-lg border px-4 py-3 text-left text-sm transition ${
              selected
                ? "border-neutral-900 bg-neutral-900 text-white"
                : "border-neutral-300 bg-neutral-100 text-neutral-600"
            }`}
          >
            {choice.isObviousAntonym && <span aria-hidden>★ </span>}
            {choice.label}
          </button>
        );
      })}
    </div>
  );
}
