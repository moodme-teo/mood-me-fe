// 원본 여정 로그(id 기반) → AI 페이로드(라벨·태그) 변환. AI는 id(c07, s2, t2-2)를
// 모른다 — 반드시 라벨·태그로 번역해서 보낸다 (mood-test-questions.md 부록 1).

import type { Journey } from "@/lib/mood-test/journey";
import { computePersonaResult } from "@/lib/mood-test/persona";
import { CARDS, SHADOWS, TRANSITIONS } from "@/lib/mood-test/seed";

// computePersonaResult가 결정론적으로 확정한 유형명이 없을 때(코어·테마 어느 한쪽이
// 비는 극단 케이스 — moodboard-persona-ratio.md §열린 문제)의 최후 폴백.
const FALLBACK_TYPE_NAME = "나만의 무드";

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
  // computePersonaResult(persona.ts, 결정론적 — 보드 이미지 생성이 쓰는 것과 동일한
  // 함수)가 이미 확정한 값. type_name은 GPT-5가 재판정하지 않고 그대로 받아 글만
  // 쓴다(ADR 004 §개정) — 리포트와 보드 이미지가 다른 유형을 가리키는 모순을 막는다.
  // core/theme 비율 분포는 참고용 — 1등 외 페르소나의 존재감을 글에 반영하는 데만 쓴다.
  persona: {
    type_name: string;
    core: { name: string; ratio: number }[];
    theme: { name: string; ratio: number }[];
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

function resolvePersonaContext(
  journey: Journey,
): MoodAnalysisPayload["persona"] {
  const result = computePersonaResult(journey);
  const typeName =
    result.typeName ?? result.topCore ?? result.topTheme ?? FALLBACK_TYPE_NAME;

  return {
    type_name: typeName,
    core: result.core.map((rank) => ({
      name: rank.persona,
      ratio: rank.ratio,
    })),
    theme: result.theme.map((rank) => ({
      name: rank.persona,
      ratio: rank.ratio,
    })),
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
    persona: resolvePersonaContext(journey),
  };
}
