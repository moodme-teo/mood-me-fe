import { useCallback, useMemo, useReducer } from "react";

import {
  buildJourney,
  buildScreens,
  commitScreen,
  createInitialFlowState,
  flowReducer,
  getScreenCopy,
  poolIdsForScreen,
  previewCardIdsForScreen,
  targetCountForScreen,
  TOTAL_SCREENS,
  willResetDownstream,
} from "@/components/test/mood-test-flow";
import { SHADOWS } from "@/lib/mood-test/seed";

export function useMoodTestFlow() {
  const [state, dispatch] = useReducer(
    flowReducer,
    undefined,
    createInitialFlowState,
  );

  const screens = useMemo(
    () => buildScreens(state.committed.shadows),
    [state.committed.shadows],
  );
  const screen = screens[state.screenIndex];
  const target = targetCountForScreen(screen);
  const poolIds = poolIdsForScreen(screen, state.committed);
  const previewCardIds = previewCardIdsForScreen(
    screen,
    state.draft,
    state.committed,
  );
  const shadowLabel =
    screen.kind === "transition"
      ? SHADOWS.find((s) => s.id === screen.shadowId)?.label
      : undefined;
  const copy = getScreenCopy(screen, shadowLabel);

  const toggle = useCallback(
    (id: string) => {
      dispatch(
        screen.kind === "transition"
          ? { type: "PICK", id }
          : { type: "TOGGLE", id },
      );
    },
    [screen.kind],
  );

  const confirm = useCallback(() => dispatch({ type: "CONFIRM" }), []);
  const back = useCallback(() => dispatch({ type: "BACK" }), []);

  const buildJourneyFromDraft = useCallback(() => {
    const committed = commitScreen(screen, state.draft, state.committed);
    return buildJourney(committed);
  }, [screen, state.draft, state.committed]);

  return {
    screen,
    screenIndex: state.screenIndex,
    totalScreens: TOTAL_SCREENS,
    poolIds,
    draft: state.draft,
    target,
    canConfirm: state.draft.length === target,
    /** 지금 확정하면 뒤 단계 선택이 지워진다 — 확인을 받아야 한다. */
    willResetDownstream: willResetDownstream(
      screen,
      state.draft,
      state.committed,
    ),
    isFirstScreen: state.screenIndex === 0,
    isLastScreen: state.screenIndex === TOTAL_SCREENS - 1,
    copy,
    previewCardIds,
    toggle,
    confirm,
    back,
    buildJourneyFromDraft,
  };
}
