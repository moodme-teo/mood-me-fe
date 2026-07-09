"use client";

// 무드보드 요소 타입·규격의 단일 원천은 @/types/moodboard 다.
// 캔버스 구역은 그 타입을 재수출해 쓰고(외부는 배럴 index.ts 로만 접근),
// 여기에는 캔버스 편집 UI 고유 타입만 남긴다.
import type { MoodboardElement } from "@/types/moodboard";

export {
  EXPORT_PIXEL_RATIO,
  MOODBOARD_HEIGHT,
  MOODBOARD_WIDTH,
} from "@/types/moodboard";
export type {
  ImageElement,
  MoodboardElement,
  PenElement,
  StickerAssetId,
  StickerElement,
  TextElement,
} from "@/types/moodboard";

export type MoodboardTool = "move" | "sticker" | "text" | "pen" | "eraser";

export type MoodboardDraft = {
  moodboardId: string;
  baseImageUrl: string;
  elements: MoodboardElement[];
  updatedAt: string;
};
