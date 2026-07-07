import {
  MOCK_CARDS,
  MOCK_SHADOWS,
  MOCK_TRANSITIONS,
} from "@/lib/mood-test/mock";
import CardGrid from "./CardGrid";
import ShadowChips from "./ShadowChips";
import TransitionChoices from "./TransitionChoices";
import type { Stage } from "./stages";

// 전환(D) 단계는 실제로는 사용자가 고른 그림자 3개를 순회하지만,
// 레이아웃 골격에서는 대표로 첫 번째 그림자(s1)의 선택지만 보여준다.
const SAMPLE_TRANSITION_SHADOW_ID = "s1";

export default function StageBody({ stage }: { stage: Stage }) {
  switch (stage.id) {
    case "gather":
      return <CardGrid cards={MOCK_CARDS} />;
    case "trim1":
      return <CardGrid cards={MOCK_CARDS.slice(0, 12)} />;
    case "trim2":
      return <CardGrid cards={MOCK_CARDS.slice(0, 8)} />;
    case "final":
      return <CardGrid cards={MOCK_CARDS.slice(0, 8)} />;
    case "shadow":
      return <ShadowChips shadows={MOCK_SHADOWS} />;
    case "transition":
      return (
        <TransitionChoices
          choices={MOCK_TRANSITIONS.filter(
            (t) => t.shadowId === SAMPLE_TRANSITION_SHADOW_ID,
          )}
        />
      );
  }
}
