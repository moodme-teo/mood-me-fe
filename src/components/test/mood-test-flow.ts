// 추구미 테스트 3막 상태 기계 — 화면 목록·풀·타깃 개수·커밋 규칙을 순수 함수로 정의한다.
// 실제 React 연결은 useMoodTestFlow.ts. 스펙: docs/work/todo/mood-test-questions.md

import type {
  CommittedState,
  CommittedTransition,
  FlowProgress,
} from "@/lib/mood-test/flow-state";
import { INITIAL_COMMITTED } from "@/lib/mood-test/flow-state";
import type { Journey } from "@/lib/mood-test/journey";
import { CARDS, SHADOWS, TRANSITIONS } from "@/lib/mood-test/seed";

const CARD_ID_SET = new Set(CARDS.map((card) => card.id));

export type ScreenDescriptor =
  | { kind: "gather" }
  | { kind: "trim1" }
  | { kind: "trim2" }
  | { kind: "shadow" }
  | { kind: "transition"; shadowId: string; order: number }
  | { kind: "final" };

export type { CommittedState, CommittedTransition };

export type FlowState = {
  screenIndex: number;
  committed: CommittedState;
  draft: string[]; // 현재 화면에서 진행 중인 선택
  draftHistory: string[][]; // 현재 화면에서의 되돌리기(UNDO)용 draft 스냅샷 스택
};

export type FlowAction =
  | { type: "TOGGLE"; id: string } // 다중 선택 화면 (A/B1/B2/C/E)
  | { type: "PICK"; id: string } // 단일 선택 화면 (D)
  | { type: "CONFIRM" }
  | { type: "BACK" }
  | { type: "UNDO" } // 현재 화면 안에서의 마지막 선택 되돌리기
  | { type: "RESTORE"; progress: FlowProgress }; // 저장된 드래프트로 되돌아가기

// 화면 8개 고정: A(1) + B1(1) + B2(1) + C(1) + D(3, 그림자별) + E(1)
export const TOTAL_SCREENS = 8;

export function createInitialFlowState(): FlowState {
  return {
    screenIndex: 0,
    committed: INITIAL_COMMITTED,
    draft: [],
    draftHistory: [],
  };
}

export function buildScreens(shadows: string[]): ScreenDescriptor[] {
  return [
    { kind: "gather" },
    { kind: "trim1" },
    { kind: "trim2" },
    { kind: "shadow" },
    ...shadows.map((shadowId, order) => ({
      kind: "transition" as const,
      shadowId,
      order,
    })),
    { kind: "final" },
  ];
}

export function targetCountForScreen(screen: ScreenDescriptor): number {
  switch (screen.kind) {
    case "gather":
      return 12;
    case "trim1":
      return 4;
    case "trim2":
      return 3;
    case "shadow":
      return 3;
    case "transition":
      return 1;
    case "final":
      return 5;
  }
}

export function poolIdsForScreen(
  screen: ScreenDescriptor,
  committed: CommittedState,
): string[] {
  switch (screen.kind) {
    case "gather":
      return CARDS.map((card) => card.id);
    case "trim1":
      return committed.selected;
    case "trim2":
      return committed.selected.filter(
        (id) => !committed.droppedR1.includes(id),
      );
    case "shadow":
      return SHADOWS.map((shadow) => shadow.id);
    case "transition":
      return TRANSITIONS.filter((t) => t.shadowId === screen.shadowId).map(
        (t) => t.id,
      );
    case "final": {
      const survivors = committed.selected.filter(
        (id) =>
          !committed.droppedR1.includes(id) &&
          !committed.droppedR2.includes(id),
      );
      const desires = committed.transitions
        .filter((t): t is CommittedTransition => t !== null)
        .map((t) => t.picked);
      return [...survivors, ...desires];
    }
  }
}

export function initialDraftForScreen(
  screen: ScreenDescriptor,
  committed: CommittedState,
): string[] {
  switch (screen.kind) {
    case "gather":
      return committed.selected;
    case "trim1":
      return committed.droppedR1;
    case "trim2":
      return committed.droppedR2;
    case "shadow":
      return committed.shadows;
    case "transition": {
      const existing = committed.transitions[screen.order];
      return existing && existing.shadow === screen.shadowId
        ? [existing.picked]
        : [];
    }
    case "final":
      // E는 걸러내기(subtractive) UI다 — draft는 "남길 카드"를 의미하므로, 아직 확정 전이면
      // pool 전체(8장)에서 시작해 드래그로 하나씩 줄여나간다. commitScreen 계약은 그대로 유지된다.
      return committed.final.length > 0
        ? committed.final
        : poolIdsForScreen(screen, committed);
  }
}

// 이전 단계를 다시 선택하면 그 위에 쌓인 하위 단계 데이터는 더 이상 유효하지 않다 —
// 예: 담은 12장이 바뀌면 예전 덜어내기 결과가 그 카드들을 가리키지 못할 수 있다.
// 하위 단계는 다시 진행하며 새로 채우도록 초기화한다.
function sameSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const setB = new Set(b);
  return a.every((id) => setB.has(id));
}

/**
 * 화면별로 "이 화면을 고치면 무효가 되는 뒤 단계" 목록. commitScreen 이 읽는다.
 *
 * 담기(gather)가 shadows를 지우지 않는 이유: 그림자는 고정된 칩 8개에서 고르므로 담은
 * 카드와 무관하다. 반대로 그림자를 바꾸면 전환(transitions)은 그림자별 4지선다라 통째로 무효다.
 */
const DOWNSTREAM_OF: Record<
  ScreenDescriptor["kind"],
  readonly (keyof CommittedState)[]
> = {
  gather: ["droppedR1", "droppedR2", "final", "droppedFinal"],
  trim1: ["droppedR2", "final", "droppedFinal"],
  trim2: ["final", "droppedFinal"],
  shadow: ["transitions", "final", "droppedFinal"],
  transition: ["final", "droppedFinal"],
  final: [],
};

/** DOWNSTREAM_OF 의 필드들을 비운 값. transitions 만 배열 모양이 달라 따로 다룬다. */
function clearedDownstream(screen: ScreenDescriptor): Partial<CommittedState> {
  const cleared: Partial<CommittedState> = {};
  for (const field of DOWNSTREAM_OF[screen.kind]) {
    if (field === "transitions") cleared.transitions = [null, null, null];
    else cleared[field] = [] as never;
  }
  return cleared;
}

export function commitScreen(
  screen: ScreenDescriptor,
  draft: string[],
  committed: CommittedState,
): CommittedState {
  switch (screen.kind) {
    case "gather": {
      const changed = !sameSet(draft, committed.selected);
      return {
        ...committed,
        selected: draft,
        ...(changed ? clearedDownstream(screen) : {}),
      };
    }
    case "trim1": {
      const changed = !sameSet(draft, committed.droppedR1);
      return {
        ...committed,
        droppedR1: draft,
        ...(changed ? clearedDownstream(screen) : {}),
      };
    }
    case "trim2": {
      const changed = !sameSet(draft, committed.droppedR2);
      return {
        ...committed,
        droppedR2: draft,
        ...(changed ? clearedDownstream(screen) : {}),
      };
    }
    case "shadow": {
      // 순서도 D 화면 배정에 쓰이므로 집합이 아니라 순서까지 비교한다.
      const changed = draft.join("|") !== committed.shadows.join("|");
      return {
        ...committed,
        shadows: draft,
        ...(changed ? clearedDownstream(screen) : {}),
      };
    }
    case "transition": {
      const pickedId = draft[0];
      // 아직 아무것도 안 고른 전환 화면에서 뒤로 갔을 때(BACK 이 커밋을 부른다) — picked: undefined 를
      // 기록하면 최종 화면 풀과 여정이 깨진다. 고른 게 없으면 아무것도 남기지 않는다.
      // (CONFIRM 은 canConfirm 일 때만 오므로 여기서 pickedId 는 항상 존재한다.)
      if (!pickedId) return committed;
      const prev = committed.transitions[screen.order];
      const changed = !prev || prev.picked !== pickedId;
      const nextTransitions = [...committed.transitions];
      nextTransitions[screen.order] = {
        shadow: screen.shadowId,
        picked: pickedId,
      };
      // 전환은 자기 자신이 transitions 에 쓰므로, 초기화 목록에서 그 필드는 빠져 있다.
      return {
        ...committed,
        transitions: nextTransitions,
        ...(changed ? clearedDownstream(screen) : {}),
      };
    }
    case "final": {
      const pool = poolIdsForScreen(screen, committed);
      const droppedFinal = pool.filter((id) => !draft.includes(id));
      return { ...committed, final: draft, droppedFinal };
    }
  }
}

export function toggleDraftId(
  draft: string[],
  id: string,
  target: number,
  toggles: Record<string, number>,
): { draft: string[]; toggles: Record<string, number> } {
  if (draft.includes(id)) {
    return {
      draft: draft.filter((existing) => existing !== id),
      toggles: { ...toggles, [id]: (toggles[id] ?? 0) + 1 },
    };
  }
  if (draft.length >= target) {
    return { draft, toggles }; // 정원 초과 — 무시
  }
  return { draft: [...draft, id], toggles };
}

export function pickDraftId(
  draft: string[],
  id: string,
  toggles: Record<string, number>,
): { draft: string[]; toggles: Record<string, number> } {
  if (draft[0] === id) return { draft, toggles };
  const nextToggles = draft[0]
    ? { ...toggles, [draft[0]]: (toggles[draft[0]] ?? 0) + 1 }
    : toggles;
  return { draft: [id], toggles: nextToggles };
}

export function previewCardIdsForScreen(
  screen: ScreenDescriptor,
  draft: string[],
  committed: CommittedState,
): string[] {
  switch (screen.kind) {
    case "gather":
      return draft.filter((id) => CARD_ID_SET.has(id));
    case "trim1":
      return committed.selected.filter((id) => !draft.includes(id));
    case "trim2": {
      const remaining8 = committed.selected.filter(
        (id) => !committed.droppedR1.includes(id),
      );
      return remaining8.filter((id) => !draft.includes(id));
    }
    case "final":
      return draft.filter((id) => CARD_ID_SET.has(id));
    case "shadow":
    case "transition":
      return committed.selected.filter(
        (id) =>
          !committed.droppedR1.includes(id) &&
          !committed.droppedR2.includes(id),
      );
  }
}

export type ScreenCopy = { kicker: string; title: string; hint?: string };

const BASE_COPY: Record<
  Exclude<ScreenDescriptor["kind"], "transition">,
  ScreenCopy
> = {
  gather: {
    kicker: "A. 담기",
    title: "끌리는 카드 12장을 담아주세요",
    hint: "생각은 넣어두고, 손이 먼저 가는 걸로요",
  },
  trim1: {
    kicker: "B1. 덜어내기",
    title: "이 중 4장을 내려놓아 주세요",
    hint: "아깝죠? 괜찮아요, 남는 게 더 선명해져요",
  },
  trim2: {
    kicker: "B2. 덜어내기",
    title: "3장만 더 내려놓을게요",
    hint: "지금 남은 5장이 당신의 확신이에요",
  },
  shadow: {
    kicker: "C. 그림자",
    title: "요즘 나를 무겁게 하는 것 3개를 골라주세요",
    hint: "솔직할수록 보드가 정확해져요",
  },
  final: {
    kicker: "E. 최종 대결",
    title: "마지막이에요 — 당신의 무드보드에 남길 5장을 골라주세요",
    hint: "지켜온 것과 바라는 것, 무엇이 남을까요",
  },
};

export function getScreenCopy(
  screen: ScreenDescriptor,
  shadowLabel?: string,
): ScreenCopy {
  if (screen.kind === "transition") {
    return {
      kicker: `D. 전환 (${screen.order + 1}/3)`,
      title: `'${shadowLabel ?? ""}'를 넘어서기 위해, 지금 당신에게 필요한 힘은?`,
    };
  }
  return BASE_COPY[screen.kind];
}

export function buildJourney(committed: CommittedState): Journey {
  const transitions = committed.transitions.filter(
    (t): t is CommittedTransition => t !== null,
  );
  const toggleCount = Object.values(committed.toggles).reduce(
    (sum, n) => sum + n,
    0,
  );
  return {
    selected: committed.selected,
    dropped_r1: committed.droppedR1,
    dropped_r2: committed.droppedR2,
    survivors: committed.selected.filter(
      (id) =>
        !committed.droppedR1.includes(id) && !committed.droppedR2.includes(id),
    ),
    shadows: committed.shadows,
    transitions,
    final: committed.final,
    dropped_final: committed.droppedFinal,
    toggles: committed.toggles,
    toggle_count: toggleCount,
  };
}

export function flowReducer(state: FlowState, action: FlowAction): FlowState {
  // RESTORE 는 지금 상태가 아니라 저장된 상태를 기준으로 화면을 다시 세운다.
  if (action.type === "RESTORE") {
    const { committed, draft } = action.progress;
    const screens = buildScreens(committed.shadows);
    // C(그림자)를 확정하기 전에는 D 화면이 아직 없다 — 저장된 인덱스를 그대로 믿지 않는다.
    const screenIndex = Math.min(
      action.progress.screenIndex,
      screens.length - 1,
    );
    return { screenIndex, committed, draft, draftHistory: [] };
  }

  const screens = buildScreens(state.committed.shadows);
  const screen = screens[state.screenIndex];

  switch (action.type) {
    case "TOGGLE": {
      const target = targetCountForScreen(screen);
      const { draft, toggles } = toggleDraftId(
        state.draft,
        action.id,
        target,
        state.committed.toggles,
      );
      return {
        ...state,
        draft,
        draftHistory: [...state.draftHistory, state.draft],
        committed: { ...state.committed, toggles },
      };
    }
    case "PICK": {
      const { draft, toggles } = pickDraftId(
        state.draft,
        action.id,
        state.committed.toggles,
      );
      return {
        ...state,
        draft,
        draftHistory: [...state.draftHistory, state.draft],
        committed: { ...state.committed, toggles },
      };
    }
    case "CONFIRM": {
      const committed = commitScreen(screen, state.draft, state.committed);
      const nextIndex = Math.min(state.screenIndex + 1, TOTAL_SCREENS - 1);
      const nextScreens = buildScreens(committed.shadows);
      const nextScreen = nextScreens[nextIndex];
      return {
        screenIndex: nextIndex,
        committed,
        draft: initialDraftForScreen(nextScreen, committed),
        draftHistory: [],
      };
    }
    case "BACK": {
      const prevIndex = Math.max(state.screenIndex - 1, 0);
      // 뒤로 가도 지금 화면에서 고른 것을 잃지 않도록, 떠나기 전에 현재 draft 를 확정해 둔다 —
      // 다음으로 갈 때의 CONFIRM 과 같은 저장이되 화면만 한 칸 뒤로 간다. 선택이 바뀌었다면
      // commitScreen 이 하위 단계를 알아서 무효화한다(변경 없으면 그대로).
      const committed = commitScreen(screen, state.draft, state.committed);
      const prevScreens = buildScreens(committed.shadows);
      const prevScreen = prevScreens[prevIndex];
      return {
        ...state,
        screenIndex: prevIndex,
        committed,
        draft: initialDraftForScreen(prevScreen, committed),
        draftHistory: [],
      };
    }
    case "UNDO": {
      if (state.draftHistory.length === 0) return state;
      const draft = state.draftHistory[state.draftHistory.length - 1];
      return {
        ...state,
        draft,
        draftHistory: state.draftHistory.slice(0, -1),
      };
    }
  }
}
