import type { GenerationJob } from "@/lib/api/get-generation-job";
import type { GetMoodboardResponse } from "@/lib/api/get-moodboard";
import type { MoodboardSummary } from "@/lib/moodboard/summary";

// 테스트 전반에서 재사용하는 고정 식별자. guestSessionId 는 서버 스키마가 uuid 를 요구한다.
export const GUEST_SESSION_ID = "11111111-1111-4111-8111-111111111111";
export const TEST_SESSION_ID = "22222222-2222-4222-8222-222222222222";
export const MOODBOARD_ID = "33333333-3333-4333-8333-333333333333";
export const JOB_ID = "44444444-4444-4444-8444-444444444444";

// public/ 에 실제로 존재하는 이미지 — AI 생성 이미지는 매번 달라지므로 고정 mock 을 쓴다.
export const BASE_IMAGE_URL = "/test-image/aesthetic/c18.jpg";

export const ELEMENTS: GetMoodboardResponse["elements"] = [
  {
    id: "sticker-1",
    x: 48,
    y: 96,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    z_index: 1,
    type: "sticker",
    properties: { assetId: "silver-star", width: 64, height: 64 },
  },
  {
    id: "text-1",
    x: 40,
    y: 420,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    z_index: 2,
    type: "text",
    properties: {
      content: "조용한 확신",
      fontFamily: "Pretendard",
      fontSize: 22,
      color: "#111111",
      align: "center",
      width: 240,
    },
  },
];

export const MOODBOARD: GetMoodboardResponse = {
  id: MOODBOARD_ID,
  baseImageUrl: BASE_IMAGE_URL,
  elements: ELEMENTS,
  moodProfile: {
    title: "조용한 확신",
    type_name: "고요한 몽상가",
    reading: {
      conviction: "천천히 고르지만 한번 고르면 오래 봅니다.",
      desire: "소란보다 여백을 먼저 챙깁니다.",
      showdown: "마지막에는 결국 스스로의 속도를 택했습니다.",
    },
    mood_vector: {
      calm_energy: 0.32,
      warm_cool: 0.48,
      minimal_maximal: 0.41,
      vintage_modern: 0.55,
      real_dreamy: 0.7,
    },
    keywords: ["고요", "몽환", "여백"],
    sticker_phrases: ["오늘도 내 속도로"],
  },
  isGuest: true,
  updatedAt: "2026-07-09T00:00:00.000Z",
};

// 홈(History)이 GET /api/moodboards 로 받는 목록. 카드의 접근성 이름은
// title 과 typeName 이 다르면 "{typeName} · {title} 결과 열람하기" 가 된다.
export const MOODBOARD_SUMMARIES: MoodboardSummary[] = [
  {
    id: MOODBOARD_ID,
    thumbnailUrl: BASE_IMAGE_URL,
    typeName: "고요한 몽상가",
    title: "조용한 확신",
    updatedAt: "2026-07-09T00:00:00.000Z",
    isGuest: true,
  },
];

export function generationJob(
  status: GenerationJob["status"],
  progressPercent: number,
): GenerationJob {
  return {
    id: JOB_ID,
    status,
    progressPercent,
    statusMessage: null,
    elements: status === "completed" ? ELEMENTS : [],
    baseImageUrl: status === "completed" ? BASE_IMAGE_URL : null,
  };
}
