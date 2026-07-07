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
          className="rounded-lg border border-neutral-300 bg-neutral-100 px-4 py-3 text-sm text-neutral-600"
        >
          {choice.isObviousAntonym && <span aria-hidden>★ </span>}
          {choice.label}
        </div>
      ))}
    </div>
  );
}
