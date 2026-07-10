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

/**
 * 크롭 에디터가 저장하는 결과물은 DB 컬럼 이름(`exported_image_data_url`) 그대로 data URL 이다.
 * 픽셀을 단언할 수 있도록 사분면 색이 확실한 4x4 PNG 를 쓴다.
 *
 *   ■ 빨강(255,0,0)  ■ 초록(0,255,0)
 *   ■ 파랑(0,0,255)  □ 투명(alpha 0)
 *
 * 투명 사분면이 핵심이다 — 내보내기가 중간에 JPEG 로 재인코딩되면 alpha 가 죽어 곧바로 잡힌다.
 */
export const EXPORTED_IMAGE_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAGUlEQVR42mP4z8DwH4SRIJoAlA9iwACqAADIpRfpEbgpjQAAAABJRU5ErkJggg==";

/** EXPORTED_IMAGE_DATA_URL 의 사분면 — 비율 좌표와 기대 색. */
export const EXPORTED_IMAGE_QUADRANTS = [
  { point: { x: 0.15, y: 0.15 }, color: { r: 255, g: 0, b: 0, a: 255 } },
  { point: { x: 0.85, y: 0.15 }, color: { r: 0, g: 255, b: 0, a: 255 } },
  { point: { x: 0.15, y: 0.85 }, color: { r: 0, g: 0, b: 255, a: 255 } },
  { point: { x: 0.85, y: 0.85 }, color: { r: 0, g: 0, b: 0, a: 0 } },
] as const;

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
  // 크롭 에디터(#102)가 저장한 평면 결과 이미지. 이게 있으면 결과물 페이지는 Konva 캔버스가
  // 아니라 <img> 로 렌더한다 — 지금 실사용자가 만드는 모든 보드가 이 경로다.
  exportedImageUrl: EXPORTED_IMAGE_DATA_URL,
  isGuest: true,
  updatedAt: "2026-07-09T00:00:00.000Z",
};

// #102 이전에 저장된 보드 — exportedImageUrl 이 없어 뷰어(BoardPreview)가 elements 를
// Konva 로 합성해 그린다. 이 분기가 살아 있는 한 커버리지를 유지한다.
export const LEGACY_MOODBOARD: GetMoodboardResponse = {
  ...MOODBOARD,
  exportedImageUrl: null,
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
