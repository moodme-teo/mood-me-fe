import CardGrid from "@/components/test/CardGrid";
import DiscardStack from "@/components/test/DiscardStack";
import FinalGrid from "@/components/test/FinalGrid";
import type { ScreenDescriptor } from "@/components/test/mood-test-flow";
import ShadowChips from "@/components/test/ShadowChips";
import TransitionChoices from "@/components/test/TransitionChoices";
import { CARDS, SHADOWS, TRANSITIONS } from "@/lib/mood-test/seed";

const CARD_MAP = new Map(CARDS.map((card) => [card.id, card]));
const SHADOW_MAP = new Map(SHADOWS.map((shadow) => [shadow.id, shadow]));

type Props = {
  screen: ScreenDescriptor;
  poolIds: string[];
  draft: string[];
  target: number;
  onToggle: (id: string) => void;
};

export default function StageBody({
  screen,
  poolIds,
  draft,
  target,
  onToggle,
}: Props) {
  switch (screen.kind) {
    case "gather": {
      const cards = poolIds
        .map((id) => CARD_MAP.get(id))
        .filter((card): card is NonNullable<typeof card> => Boolean(card));
      return (
        <CardGrid
          cards={cards}
          selectedIds={draft}
          atCapacity={draft.length >= target}
          onToggle={onToggle}
        />
      );
    }
    case "trim1":
    case "trim2": {
      const cards = poolIds
        .map((id) => CARD_MAP.get(id))
        .filter((card): card is NonNullable<typeof card> => Boolean(card));
      return (
        <DiscardStack
          cards={cards}
          selectedIds={draft}
          atCapacity={draft.length >= target}
          onToggle={onToggle}
        />
      );
    }
    case "shadow": {
      const shadows = poolIds
        .map((id) => SHADOW_MAP.get(id))
        .filter((shadow): shadow is NonNullable<typeof shadow> =>
          Boolean(shadow),
        );
      return (
        <ShadowChips
          shadows={shadows}
          selectedIds={draft}
          atCapacity={draft.length >= target}
          onToggle={onToggle}
        />
      );
    }
    case "transition": {
      const choices = TRANSITIONS.filter((t) => t.shadowId === screen.shadowId);
      return (
        <TransitionChoices
          choices={choices}
          pickedId={draft[0] ?? null}
          onPick={onToggle}
        />
      );
    }
    case "final":
      return (
        <FinalGrid
          poolIds={poolIds}
          selectedIds={draft}
          atCapacity={draft.length >= target}
          onToggle={onToggle}
        />
      );
  }
}
