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
  | "silver-star"
  | "dream-label"
  | "soft-orbit"
  | "lucky-ribbon"
  | "quiet-spark";

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

export type MoodboardElement = StickerElement | TextElement | PenElement;

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
  moodProfile: MoodProfile;
  isGuest: boolean;
  updatedAt: string;
};
