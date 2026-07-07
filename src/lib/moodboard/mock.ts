import type { Moodboard, MoodVector } from "@/types/moodboard";

const FALLBACK_BASE_IMAGES = [
  "/test-image/aesthetic/c18.jpg",
  "/test-image/aesthetic/c24.jpg",
  "/test-image/aesthetic/c27.jpg",
  "/test-image/aesthetic/c34.jpg",
];

function pickFallbackBaseImage(moodboardId: string) {
  const index =
    [...moodboardId].reduce((sum, char) => sum + char.charCodeAt(0), 0) %
    FALLBACK_BASE_IMAGES.length;
  return FALLBACK_BASE_IMAGES[index];
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function buildVector(seed: number): MoodVector {
  return {
    calm_energy: clamp01(0.28 + ((seed % 4) + 1) * 0.11),
    warm_cool: clamp01(0.34 + (seed % 3) * 0.17),
    minimal_maximal: clamp01(0.42 + (seed % 5) * 0.09),
    vintage_modern: clamp01(0.3 + (seed % 6) * 0.1),
    real_dreamy: clamp01(0.62 + (seed % 4) * 0.08),
  };
}

export function getMockMoodboard(moodboardId: string): Moodboard {
  const seed = [...moodboardId].reduce(
    (sum, char) => sum + char.charCodeAt(0),
    0,
  );

  return {
    id: moodboardId,
    baseImageUrl: pickFallbackBaseImage(moodboardId),
    elements: [
      {
        id: "sticker-dream-label",
        type: "sticker",
        x: 214,
        y: 76,
        rotation: 7,
        scaleX: 1,
        scaleY: 1,
        z_index: 1,
        properties: {
          assetId: "dream-label",
          width: 112,
          height: 44,
        },
      },
      {
        id: "text-title",
        type: "text",
        x: 38,
        y: 474,
        rotation: -2,
        scaleX: 1,
        scaleY: 1,
        z_index: 2,
        properties: {
          content: "나의 무드",
          fontFamily: "Arial",
          fontSize: 34,
          color: "#ffffff",
          align: "center",
          width: 284,
        },
      },
      {
        id: "pen-glow",
        type: "pen",
        x: 0,
        y: 0,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        z_index: 3,
        properties: {
          points: [80, 438, 116, 414, 158, 430, 204, 404, 270, 424],
          stroke: "#fff16a",
          strokeWidth: 5,
        },
      },
    ],
    moodProfile: {
      title: "고요를 모으는 사람",
      type_name: "페어리코어 × 루틴 메이커",
      reading: {
        conviction:
          "이미 마음속에는 내가 좋아하는 결을 또렷하게 고르는 힘이 있어요. 작은 장면을 오래 바라보고, 그 안에서 나다운 리듬을 찾는 편입니다.",
        desire:
          "요즘의 바람은 조금 더 가볍게 움직이는 쪽에 가까워 보여요. 완벽한 계획보다 오늘 바로 붙잡을 수 있는 작은 반짝임이 필요합니다.",
        showdown:
          "그래서 이 무드는 차분함과 설렘이 같이 놓인 보드예요. 익숙한 안정감 위에 낯선 빛을 살짝 올려, 다음 장면으로 넘어갈 준비를 해줍니다.",
      },
      mood_vector: buildVector(seed),
      keywords: [
        "안개빛",
        "은은한 루틴",
        "페어리",
        "작은 확신",
        "부드러운 활기",
        "빛 조각",
        "초록의 숨",
        "몽환",
        "나만의 속도",
      ],
      sticker_phrases: ["slow glow", "tiny luck", "my rhythm"],
    },
    isGuest: true,
    updatedAt: new Date().toISOString(),
  };
}
