// 추구미 테스트 3막 상태 기계 — 화면 목록·풀·타깃 개수·커밋 규칙을 순수 함수로 정의한다.
// 실제 React 연결은 useMoodTestFlow.ts. 스펙: docs/work/todo/mood-test-questions.md

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

export type CommittedTransition = { shadow: string; picked: string };

export type CommittedState = {
  selected: string[]; // A 완료본 (12, 담은 순서 유지)
  droppedR1: string[]; // B1 완료본 (4)
  droppedR2: string[]; // B2 완료본 (3)
  shadows: string[]; // C 완료본 (3, 선택 순서 = D 화면 순서)
  transitions: (CommittedTransition | null)[]; // D 완료본, shadows와 인덱스 정렬 (길이 3)
  final: string[]; // E 완료본 (5)
  droppedFinal: string[]; // E 탈락 (3)
  toggles: Record<string, number>; // id별 담았다 뺐다 횟수 (망설임 신호)
};

export type FlowState = {
  screenIndex: number;
  committed: CommittedState;
  draft: string[]; // 현재 화면에서 진행 중인 선택
};

export type FlowAction =
  | { type: "TOGGLE"; id: string } // 다중 선택 화면 (A/B1/B2/C/E)
  | { type: "PICK"; id: string } // 단일 선택 화면 (D)
  | { type: "CONFIRM" }
  | { type: "BACK" };

// 화면 8개 고정: A(1) + B1(1) + B2(1) + C(1) + D(3, 그림자별) + E(1)
export const TOTAL_SCREENS = 8;

const initialCommitted: CommittedState = {
  selected: [],
  droppedR1: [],
  droppedR2: [],
  shadows: [],
  transitions: [null, null, null],
  final: [],
  droppedFinal: [],
  toggles: {},
};

export function createInitialFlowState(): FlowState {
  return { screenIndex: 0, committed: initialCommitted, draft: [] };
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
      return committed.final;
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
        ...(changed
          ? { droppedR1: [], droppedR2: [], final: [], droppedFinal: [] }
          : {}),
      };
    }
    case "trim1": {
      const changed = !sameSet(draft, committed.droppedR1);
      return {
        ...committed,
        droppedR1: draft,
        ...(changed ? { droppedR2: [], final: [], droppedFinal: [] } : {}),
      };
    }
    case "trim2": {
      const changed = !sameSet(draft, committed.droppedR2);
      return {
        ...committed,
        droppedR2: draft,
        ...(changed ? { final: [], droppedFinal: [] } : {}),
      };
    }
    case "shadow": {
      // 순서도 D 화면 배정에 쓰이므로 집합이 아니라 순서까지 비교한다.
      const changed = draft.join("|") !== committed.shadows.join("|");
      return {
        ...committed,
        shadows: draft,
        ...(changed
          ? { transitions: [null, null, null], final: [], droppedFinal: [] }
          : {}),
      };
    }
    case "transition": {
      const pickedId = draft[0];
      const prev = committed.transitions[screen.order];
      const changed = !prev || prev.picked !== pickedId;
      const nextTransitions = [...committed.transitions];
      nextTransitions[screen.order] = {
        shadow: screen.shadowId,
        picked: pickedId,
      };
      return {
        ...committed,
        transitions: nextTransitions,
        ...(changed ? { final: [], droppedFinal: [] } : {}),
      };
    }
    case "final": {
      const pool = poolIdsForScreen(screen, committed);
      const droppedFinal = pool.filter((id) => !draft.includes(id));
      return { ...committed, final: draft, droppedFinal };
    }
  }
}

/**
 * 지금 이 화면을 확정하면 뒤 단계에서 고른 내용이 지워지는가?
 *
 * commitScreen 은 상위 단계의 선택이 바뀌면 하위 단계를 조용히 비운다 — 선택지 구성 자체가
 * 달라지므로 남겨 둘 수가 없다. 문제는 사용자가 뒤로 돌아가 카드 한 장 바꿨을 뿐인데
 * 그림자·전환·최종 대결이 통째로 사라진다는 것이다. 그래서 확정 전에 물어본다.
 *
 * 판정은 commitScreen 의 결과로 한다. 초기화 규칙을 여기 다시 옮겨 적으면 둘이 어긋난다.
 * 아직 아무것도 고르지 않은 뒤 단계는 잃을 것이 없으므로 묻지 않는다.
 */
export function willResetDownstream(
  screen: ScreenDescriptor,
  draft: string[],
  committed: CommittedState,
): boolean {
  const next = commitScreen(screen, draft, committed);
  const cleared = (before: string[], after: string[]) =>
    before.length > 0 && after.length === 0;

  return (
    cleared(committed.droppedR1, next.droppedR1) ||
    cleared(committed.droppedR2, next.droppedR2) ||
    cleared(committed.final, next.final) ||
    (committed.transitions.some((t) => t !== null) &&
      next.transitions.every((t) => t === null))
  );
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
      return { ...state, draft, committed: { ...state.committed, toggles } };
    }
    case "PICK": {
      const { draft, toggles } = pickDraftId(
        state.draft,
        action.id,
        state.committed.toggles,
      );
      return { ...state, draft, committed: { ...state.committed, toggles } };
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
      };
    }
    case "BACK": {
      const prevIndex = Math.max(state.screenIndex - 1, 0);
      const prevScreen = screens[prevIndex];
      return {
        ...state,
        screenIndex: prevIndex,
        draft: initialDraftForScreen(prevScreen, state.committed),
      };
    }
  }
}
