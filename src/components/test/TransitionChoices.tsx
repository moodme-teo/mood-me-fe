import type { MockTransition } from "@/lib/mood-test/mock";

export default function TransitionChoices({
  choices,
}: {
  choices: MockTransition[];
}) {
  return (
    <div className="flex flex-col gap-2">
      {choices.map((choice) => (
        <div
          key={choice.id}
          className="rounded-lg border border-gray-300 bg-surface-sunken px-4 py-3 text-sm text-muted-foreground"
        >
          {choice.isObviousAntonym && <span aria-hidden>★ </span>}
          {choice.label}
        </div>
      ))}
    </div>
  );
}
