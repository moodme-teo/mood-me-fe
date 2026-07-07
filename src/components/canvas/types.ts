"use client";

export const MOODBOARD_WIDTH = 360;
export const MOODBOARD_HEIGHT = 640;
export const EXPORT_PIXEL_RATIO = 2;

export type MoodboardTool = "move" | "sticker" | "text" | "pen" | "eraser";

type BaseElement = {
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

export type StickerElement = BaseElement & {
  type: "sticker";
  properties: {
    assetId: StickerAssetId;
    width: number;
    height: number;
  };
};

export type TextElement = BaseElement & {
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

export type PenElement = BaseElement & {
  type: "pen";
  properties: {
    points: number[];
    stroke: string;
    strokeWidth: number;
  };
};

export type MoodboardElement = StickerElement | TextElement | PenElement;

export type MoodboardDraft = {
  moodboardId: string;
  baseImageUrl: string;
  elements: MoodboardElement[];
  updatedAt: string;
};
