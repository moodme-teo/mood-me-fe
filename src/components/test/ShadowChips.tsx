import type { MockShadow } from "@/lib/mood-test/mock";

export default function ShadowChips({ shadows }: { shadows: MockShadow[] }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {shadows.map((shadow) => (
        <div
          key={shadow.id}
          className="flex items-center justify-center rounded-full border border-neutral-300 bg-neutral-100 px-4 py-3 text-sm text-neutral-600"
        >
          {shadow.label}
        </div>
      ))}
    </div>
  );
}
