// 원본 여정 로그(id 기반) → AI 페이로드(라벨·태그) 변환. AI는 id(c07, s2, t2-2)를
// 모른다 — 반드시 라벨·태그로 번역해서 보낸다 (mood-test-questions.md 부록 1).

import type { Journey } from "@/lib/mood-test/journey";
import {
  isAestheticCore,
  isLifeTheme,
  topScores,
  TRANSITION_THEME_WEIGHT,
} from "@/lib/mood-test/personas";
import { CARDS, SHADOWS, TRANSITIONS } from "@/lib/mood-test/seed";

const PERSONA_SCORE_TOP_N = 3;

const CARD_MAP = new Map(CARDS.map((card) => [card.id, card]));
const SHADOW_MAP = new Map(SHADOWS.map((shadow) => [shadow.id, shadow]));
const TRANSITION_MAP = new Map(TRANSITIONS.map((t) => [t.id, t]));

export type MoodAnalysisPayload = {
  convictions: { label: string; tags: string[]; hesitation?: number }[];
  journey: {
    early_drops: { label: string; tags: string[] }[];
    late_drops: { label: string; tags: string[] }[];
  };
  shadows: string[];
  transitions: {
    shadow: string;
    picked: string;
    theme: string | null;
    was_obvious_antonym: boolean;
    not_picked: string[];
  }[];
  final_showdown: {
    kept_convictions: string[];
    kept_desires: string[];
    dropped_convictions: string[];
    dropped_desires: string[];
  };
  persona_scores: {
    core_scores: Record<string, number>;
    theme_scores: Record<string, number>;
  };
};

function cardLabel(id: string): string {
  return CARD_MAP.get(id)?.label ?? id;
}

function cardTags(id: string): string[] {
  return CARD_MAP.get(id)?.promptTags ?? [];
}

function shadowLabel(id: string): string {
  return SHADOW_MAP.get(id)?.label ?? id;
}

function transitionLabel(id: string): string {
  return TRANSITION_MAP.get(id)?.label ?? id;
}

function buildCardEntries(ids: string[], toggles: Record<string, number>) {
  return ids.map((id) => {
    const hesitation = toggles[id];
    return {
      label: cardLabel(id),
      tags: cardTags(id),
      ...(hesitation ? { hesitation } : {}),
    };
  });
}

function buildTransitionEntries(journey: Journey) {
  return journey.transitions.map(({ shadow, picked }) => {
    const pickedTransition = TRANSITION_MAP.get(picked);
    const notPicked = TRANSITIONS.filter(
      (t) => t.shadowId === shadow && t.id !== picked,
    ).map((t) => (t.isObviousAntonym ? `${t.label}(뻔한 반대말)` : t.label));

    return {
      shadow: shadowLabel(shadow),
      picked: pickedTransition?.label ?? picked,
      theme: pickedTransition?.themeTag ?? null,
      was_obvious_antonym: pickedTransition?.isObviousAntonym ?? false,
      not_picked: notPicked,
    };
  });
}

function buildPersonaScores(journey: Journey) {
  const coreScores: Record<string, number> = {};
  const themeScores: Record<string, number> = {};

  for (const id of journey.survivors) {
    const card = CARD_MAP.get(id);
    if (!card) continue;
    for (const [persona, weight] of Object.entries(card.personaWeights)) {
      if (isAestheticCore(persona)) {
        coreScores[persona] = (coreScores[persona] ?? 0) + weight;
      } else if (isLifeTheme(persona)) {
        themeScores[persona] = (themeScores[persona] ?? 0) + weight;
      }
    }
  }

  for (const { picked } of journey.transitions) {
    const theme = TRANSITION_MAP.get(picked)?.themeTag;
    if (theme) {
      themeScores[theme] = (themeScores[theme] ?? 0) + TRANSITION_THEME_WEIGHT;
    }
  }

  return {
    core_scores: topScores(coreScores, PERSONA_SCORE_TOP_N),
    theme_scores: topScores(themeScores, PERSONA_SCORE_TOP_N),
  };
}

export function buildMoodAnalysisPayload(
  journey: Journey,
): MoodAnalysisPayload {
  const pickedTransitionIds = new Set(journey.transitions.map((t) => t.picked));
  const survivorIds = new Set(journey.survivors);

  return {
    convictions: buildCardEntries(journey.survivors, journey.toggles),
    journey: {
      early_drops: buildCardEntries(journey.dropped_r1, journey.toggles),
      late_drops: buildCardEntries(journey.dropped_r2, journey.toggles),
    },
    shadows: journey.shadows.map(shadowLabel),
    transitions: buildTransitionEntries(journey),
    final_showdown: {
      kept_convictions: journey.final
        .filter((id) => survivorIds.has(id))
        .map(cardLabel),
      kept_desires: journey.final
        .filter((id) => pickedTransitionIds.has(id))
        .map(transitionLabel),
      dropped_convictions: journey.dropped_final
        .filter((id) => survivorIds.has(id))
        .map(cardLabel),
      dropped_desires: journey.dropped_final
        .filter((id) => pickedTransitionIds.has(id))
        .map(transitionLabel),
    },
    persona_scores: buildPersonaScores(journey),
  };
}
