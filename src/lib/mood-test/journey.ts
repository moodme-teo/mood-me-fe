// 추구미 테스트 여정 로그 — 완료된 세션이 한 번에 보내는 답변 스키마.
// docs/work/todo/mood-test-questions.md "로깅 스키마" 절 그대로.

export type Transition = {
  shadow: string;
  picked: string;
};

export type Journey = {
  selected: string[];
  dropped_r1: string[];
  dropped_r2: string[];
  survivors: string[];
  shadows: string[];
  transitions: Transition[];
  final: string[];
  dropped_final: string[];
  toggles: Record<string, number>;
  toggle_count: number;
};

const EXPECTED_LENGTHS: Record<
  "selected" | "dropped_r1" | "dropped_r2" | "survivors" | "shadows" | "transitions" | "final" | "dropped_final",
  number
> = {
  selected: 12,
  dropped_r1: 4,
  dropped_r2: 3,
  survivors: 5,
  shadows: 3,
  transitions: 3,
  final: 5,
  dropped_final: 3,
};

function sameSet(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  const setA = new Set(a);
  if (setA.size !== a.length) return false; // 중복 원소 방지
  const setB = new Set(b);
  if (setB.size !== b.length) return false;
  for (const item of setA) if (!setB.has(item)) return false;
  return true;
}

export function validateJourney(journey: Journey): { valid: true } | { valid: false; error: string } {
  for (const [key, expected] of Object.entries(EXPECTED_LENGTHS) as [keyof typeof EXPECTED_LENGTHS, number][]) {
    const actual = journey[key]?.length;
    if (actual !== expected) {
      return { valid: false, error: `${key}는 ${expected}개여야 합니다 (받은 값: ${actual ?? "undefined"})` };
    }
  }

  // selected(12) = dropped_r1(4) + dropped_r2(3) + survivors(5) — 세 그룹이 selected를 정확히 분할해야 함
  const partition = [...journey.dropped_r1, ...journey.dropped_r2, ...journey.survivors];
  if (!sameSet(partition, journey.selected)) {
    return {
      valid: false,
      error: "dropped_r1 + dropped_r2 + survivors의 합집합이 selected와 일치해야 합니다",
    };
  }

  // transitions ↔ shadows 1:1 — 고른 그림자 3개와 전환 응답 3개의 그림자 id가 정확히 일치해야 함
  const transitionShadows = journey.transitions.map((t) => t.shadow);
  if (!sameSet(transitionShadows, journey.shadows)) {
    return {
      valid: false,
      error: "transitions의 shadow 목록이 shadows와 1:1로 일치해야 합니다",
    };
  }

  // final(5) + dropped_final(3) = survivors ∪ transitions.picked (확신 5 + 열망 3 = 8장 중 최종 대결)
  const showdownPool = [...journey.survivors, ...journey.transitions.map((t) => t.picked)];
  const finalPartition = [...journey.final, ...journey.dropped_final];
  if (!sameSet(finalPartition, showdownPool)) {
    return {
      valid: false,
      error: "final + dropped_final의 합집합이 survivors + transitions.picked(8장)와 일치해야 합니다",
    };
  }

  return { valid: true };
}
