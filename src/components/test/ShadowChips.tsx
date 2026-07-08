import type { MockShadow } from "@/lib/mood-test/mock";

export default function ShadowChips({ shadows }: { shadows: MockShadow[] }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {shadows.map((shadow) => (
        <div
          key={shadow.id}
          className="flex items-center justify-center rounded-full border border-gray-300 bg-surface-sunken px-4 py-3 text-sm text-muted-foreground"
        >
          {shadow.label}
        </div>
      ))}
    </div>
  );
}
