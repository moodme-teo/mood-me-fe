// 추구미 여정 → 페르소나 점수 산출. 카드(미학 코어 축)와 전환(인생 테마 축)을 분리 집계한다.
// 산출 방식·가중치의 확정 근거와 워크드 예시: docs/work/todo/moodboard/moodboard-persona-ratio.md
// fate 배수는 "늦게 살아남을수록 강한 신호" 원리(mood-test-questions.md 해석 규칙)를 숫자로 옮긴 것.

import type { Journey } from "@/lib/mood-test/journey";
import { CARDS, TRANSITIONS } from "@/lib/mood-test/seed";

// 미학 코어 14종 — 카드가 재는 '어떻게 보이고 싶나'(비주얼) 축. type_name의 왼쪽.
export const AESTHETIC_CORES = [
  "클린 걸",
  "올드 머니",
  "코케트",
  "Y2K 키치",
  "인디 슬리즈",
  "다크 아카데미아",
  "라이트 아카데미아",
  "코티지코어",
  "페어리코어",
  "코스탈",
  "소프트 그런지",
  "테크 노어",
  "맥시멀 글램",
  "네오 로맨틱",
] as const;

export type AestheticCore = (typeof AESTHETIC_CORES)[number];

// 인생 테마 6종 — 전환이 재는 '어떻게 살고 싶나'(태도) 축. type_name의 오른쪽.
export const LIFE_THEMES = [
  "커리어 보스",
  "웰니스 러너",
  "트래블러",
  "러키걸",
  "스피리추얼",
  "코지 홈바디",
] as const;

export type LifeTheme = (typeof LIFE_THEMES)[number];

const THEME_SET = new Set<string>(LIFE_THEMES);

// 전환 id → 인생 테마. seed.ts의 themeTag가 정본이다 (mood-test-questions.md D단계 표와 동일).
// ★뻔한 반대말(t*-1)은 themeTag가 null이라 여기 실리지 않는다 → 테마 가중 없음.
const TRANSITION_THEME = new Map<string, LifeTheme>(
  TRANSITIONS.flatMap(({ id, themeTag }) => {
    if (themeTag === null) return [];
    if (!THEME_SET.has(themeTag)) {
      throw new Error(
        `seed.ts 전환 ${id}의 themeTag "${themeTag}"가 인생 테마 6종에 없습니다.`,
      );
    }
    return [[id, themeTag as LifeTheme] as const];
  }),
);

// 카드 운명별 배수 — 늦게까지 살아남을수록 강한 신호. 튜닝 지점이라 상수로 노출한다.
const FATE_KEPT_CONVICTION = 3.0; // final에 남은 확신 — 최강
const FATE_DROPPED_CONVICTION = 1.5; // 열망에 밀린 확신 — 흘려보낼 준비
const FATE_LATE_DROP = 0.5; // dropped_r2 — 마지막까지 붙들다 놓은 미련
const FATE_EARLY_DROP = 0.0; // dropped_r1 — 확신만 반영하려고 0 (넓은 그물 참고하려면 0.2)

// 열망(전환) 가중 — final까지 살아남은 열망이 지금 가장 강한 갈망.
const DESIRE_KEPT = 1.0; // 확신을 밀어내고 final에 남은 열망
const DESIRE_DROPPED = 0.5; // 골랐지만 final에서 밀린 열망

const CARD_BY_ID = new Map(CARDS.map((card) => [card.id, card]));

export type PersonaRank = { persona: string; score: number; ratio: number };

export type PersonaResult = {
  core: PersonaRank[]; // 미학 코어, 점수 내림차순 (ratio = 코어 축 내 비율)
  theme: PersonaRank[]; // 인생 테마, 점수 내림차순 (ratio = 테마 축 내 비율)
  topCore: string | null;
  topTheme: string | null;
  typeName: string | null; // "<코어> × <테마>" — 한쪽이라도 비면 null
};

function addWeight(
  scores: Map<string, number>,
  persona: string,
  amount: number,
): void {
  if (amount === 0) return;
  scores.set(persona, (scores.get(persona) ?? 0) + amount);
}

// 카드 personaWeights를 운명 배수만큼 코어/테마 버킷에 나눠 담는다.
// 한 카드가 코어 페르소나와 테마 페르소나를 함께 가질 수 있으므로 페르소나별로 버킷을 가른다.
function accumulateCard(
  id: string,
  multiplier: number,
  core: Map<string, number>,
  theme: Map<string, number>,
): void {
  const card = CARD_BY_ID.get(id);
  if (!card || multiplier === 0) return;
  for (const [persona, weight] of Object.entries(card.personaWeights)) {
    const bucket = THEME_SET.has(persona) ? theme : core;
    addWeight(bucket, persona, weight * multiplier);
  }
}

function rank(scores: Map<string, number>): PersonaRank[] {
  const total = [...scores.values()].reduce((sum, n) => sum + n, 0);
  return [...scores.entries()]
    .map(([persona, score]) => ({
      persona,
      score,
      ratio: total > 0 ? score / total : 0,
    }))
    .sort((a, b) => b.score - a.score);
}

// 여정 하나를 코어/테마 두 축의 페르소나 순위로 환산한다. 순수 함수 — 부수효과 없음.
export function computePersonaResult(journey: Journey): PersonaResult {
  const core = new Map<string, number>();
  const theme = new Map<string, number>();

  const finalSet = new Set(journey.final);

  // 확신(survivors) — final 잔류 여부로 kept/dropped 배수를 가른다.
  for (const id of journey.survivors) {
    const multiplier = finalSet.has(id)
      ? FATE_KEPT_CONVICTION
      : FATE_DROPPED_CONVICTION;
    accumulateCard(id, multiplier, core, theme);
  }

  // 늦은 탈락 — 미련만큼만 반영.
  for (const id of journey.dropped_r2) {
    accumulateCard(id, FATE_LATE_DROP, core, theme);
  }

  // 이른 탈락 — FATE_EARLY_DROP=0 이라 실제 기여는 없지만, 배수를 조절하면 살아나도록 경로는 남겨둔다.
  for (const id of journey.dropped_r1) {
    accumulateCard(id, FATE_EARLY_DROP, core, theme);
  }

  // 열망(전환) → 테마 축. ★뻔한 반대말은 테마 가중이 없다.
  for (const transition of journey.transitions) {
    const themeName = TRANSITION_THEME.get(transition.picked);
    if (!themeName) continue;
    const weight = finalSet.has(transition.picked)
      ? DESIRE_KEPT
      : DESIRE_DROPPED;
    addWeight(theme, themeName, weight);
  }

  const coreRanked = rank(core);
  const themeRanked = rank(theme);
  const topCore = coreRanked[0]?.persona ?? null;
  const topTheme = themeRanked[0]?.persona ?? null;

  return {
    core: coreRanked,
    theme: themeRanked,
    topCore,
    topTheme,
    typeName: topCore && topTheme ? `${topCore} × ${topTheme}` : null,
  };
}
