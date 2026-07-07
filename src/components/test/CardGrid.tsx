import type { MockCard } from "@/lib/mood-test/mock";

export default function CardGrid({ cards }: { cards: MockCard[] }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {cards.map((card) => (
        <div
          key={card.id}
          className="flex aspect-square items-center justify-center rounded-lg border border-neutral-300 bg-neutral-100 p-2 text-center text-xs text-neutral-500"
        >
          {card.label}
        </div>
      ))}
    </div>
  );
}
