import "server-only";

import type { MoodAnalysisPayload } from "@/lib/mood-test/build-analysis-payload";
import type { Journey } from "@/lib/mood-test/journey";
import { computePersonaResult } from "@/lib/mood-test/persona";
import {
  MOODBOARD_LAYOUT_STYLES,
  pickLayoutStyle,
} from "@/lib/moodboard/layout-styles";
import type { MoodAnalysis } from "@/lib/prompts";

// AI 목 모드 — AI_MOCK=true면 GPT-5·gpt-image-2를 부르지 않고 미리 준비한 결과를 돌려준다.
// API 키·과금 없이 테스트 → 생성 → 편집 → 결과 → 공유 흐름 전체를 돌려보기 위한 것이다.
// 결과는 실제 응답처럼 job·moodboard에 저장되므로 생성 이후 화면은 손대지 않는다.
export function isAiMockEnabled(): boolean {
  return process.env.AI_MOCK === "true";
}

// 생성 중 화면의 연출이 순식간에 지나가지 않도록 실제 호출 대신 잠깐 기다린다.
const MOCK_ANALYSIS_DELAY_MS = 2_000;
const MOCK_IMAGE_DELAY_MS = 4_000;

// public/assets/results/{스타일}_{레이아웃 번호}_{레이아웃 id}.jpg — 실제 gpt-image-2로 미리
// 뽑아 둔 세로 2:3 보드. 스타일 3종 × 레이아웃 7종(MOODBOARD_LAYOUT_STYLES 순서·id와 일치).
// 상대 경로로 저장해도 편집·결과 화면이 그대로 읽는다 (update-moodboard.ts의 baseImageUrl 참고).
const MOCK_BOARD_DIR = "/assets/results";
const MOCK_BOARD_STYLES = ["y2k", "indiesleaze", "wellness"] as const;
type MockBoardStyle = (typeof MOCK_BOARD_STYLES)[number];

// 이미지가 있는 페르소나는 그 스타일로, 나머지는 여정 해시로 셋 중 하나를 고른다.
function pickMockBoardStyle(journey: Journey): MockBoardStyle {
  const { topCore, topTheme } = computePersonaResult(journey);
  if (topCore === "Y2K 키치") return "y2k";
  if (topCore === "인디 슬리즈") return "indiesleaze";
  if (topTheme === "웰니스 러너") return "wellness";
  return MOCK_BOARD_STYLES[
    hashString(journey.final.join(",")) % MOCK_BOARD_STYLES.length
  ];
}

const FALLBACK_KEYWORDS = [
  "잔잔함",
  "여유",
  "취향",
  "온기",
  "산책",
  "햇살",
  "기록",
  "느린 아침",
  "작은 기쁨",
];

function hashString(value: string): number {
  return [...value].reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function quoteCards(labels: string[]): string {
  return labels.map((label) => `'${label}'`).join(", ");
}

// 레이아웃은 실제 생성과 같은 pickLayoutStyle로 골라, 목 모드에서도 여정마다 구조가 달라진다.
export async function mockBoardImage(journey: Journey): Promise<string> {
  await wait(MOCK_IMAGE_DELAY_MS);
  const layout = pickLayoutStyle(journey);
  const layoutNumber = MOODBOARD_LAYOUT_STYLES.indexOf(layout) + 1;
  const style = pickMockBoardStyle(journey);
  return `${MOCK_BOARD_DIR}/${style}_${layoutNumber}_${layout.id}.jpg`;
}

// 여정의 실제 카드 이름을 문장에 끼워 넣어, 고정 문구지만 사람마다 다르게 읽히게 한다.
// 한국어 조사가 라벨 받침에 따라 달라지지 않도록 라벨 뒤에는 항상 "카드"를 붙인다.
export async function mockMoodAnalysis(
  payload: MoodAnalysisPayload,
): Promise<MoodAnalysis> {
  await wait(MOCK_ANALYSIS_DELAY_MS);

  const convictions = payload.convictions.map((card) => card.label);
  const desires = payload.final_showdown.kept_desires;
  const dropped = payload.final_showdown.dropped_convictions;
  const transitions = payload.transitions.map((t) => t.picked);

  const keywords = [
    ...new Set([
      ...convictions,
      ...desires,
      ...transitions,
      ...FALLBACK_KEYWORDS,
    ]),
  ].slice(0, 9);

  const seed = hashString(payload.persona.type_name);
  const axis = (offset: number) => ((seed * (offset + 3)) % 61) / 100 + 0.2;

  return {
    title: "확신과 열망 사이의 무드",
    reading: {
      conviction: `${quoteCards(convictions.slice(0, 3))} 카드를 끝까지 남겼어요. 이미 당신 안에 단단히 자리 잡은 취향이에요.`,
      desire:
        transitions.length > 0
          ? `무거운 마음 앞에서 ${quoteCards(transitions)} 카드를 골랐어요. 요즘 당신이 가장 닿고 싶은 방향이에요.`
          : "요즘의 당신은 조금 더 가볍고 자유로운 쪽으로 마음이 기울어 있어요.",
      showdown:
        desires.length > 0 && dropped.length > 0
          ? `마지막 대결에서 ${quoteCards(desires.slice(0, 2))} 카드가 ${quoteCards(dropped.slice(0, 2))} 카드를 밀어냈어요.`
          : "마지막 대결에서는 원래의 확신을 지키는 쪽을 택했어요.",
    },
    mood_vector: {
      calm_energy: axis(0),
      warm_cool: axis(1),
      minimal_maximal: axis(2),
      vintage_modern: axis(3),
      real_dreamy: axis(4),
    },
    keywords,
    sticker_phrases: [
      "작은 기적은 매일 온다",
      "나답게 천천히",
      "오늘도 충분해",
    ],
  };
}
