export const MOODBOARD_WIDTH = 360;
export const MOODBOARD_HEIGHT = 640;
export const EXPORT_PIXEL_RATIO = 2;

type BaseMoodboardElement = {
  id: string;
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  z_index: number;
};

export type StickerAssetId =
  "silver-star" | "dream-label" | "soft-orbit" | "lucky-ribbon" | "quiet-spark";

export type StickerElement = BaseMoodboardElement & {
  type: "sticker";
  properties: {
    assetId: StickerAssetId;
    width: number;
    height: number;
  };
};

export type TextElement = BaseMoodboardElement & {
  type: "text";
  properties: {
    content: string;
    fontFamily: string;
    fontSize: number;
    color: string;
    align: "left" | "center" | "right";
    width: number;
  };
};

export type PenElement = BaseMoodboardElement & {
  type: "pen";
  properties: {
    points: number[];
    stroke: string;
    strokeWidth: number;
  };
};

// 큐레이션 타일·AI 생성 컷 등 임의 이미지 요소 (#37 — 보드 조립이 채우는 슬롯).
export type ImageElement = BaseMoodboardElement & {
  type: "image";
  properties: {
    src: string;
    width: number;
    height: number;
  };
};

export type MoodboardElement =
  StickerElement | TextElement | PenElement | ImageElement;

export type MoodVector = {
  calm_energy: number;
  warm_cool: number;
  minimal_maximal: number;
  vintage_modern: number;
  real_dreamy: number;
};

export type MoodProfile = {
  title: string;
  type_name: string;
  reading: {
    conviction: string;
    desire: string;
    showdown: string;
  };
  mood_vector: MoodVector;
  keywords: string[];
  sticker_phrases: string[];
};

export type Moodboard = {
  id: string;
  baseImageUrl: string;
  elements: MoodboardElement[];
  // 크롭 에디터(#99)가 저장한 평면 결과 이미지. 있으면 결과 화면이 이 이미지를 그대로 보여준다.
  exportedImageUrl?: string | null;
  moodProfile: MoodProfile;
  isGuest: boolean;
  updatedAt: string;
};
