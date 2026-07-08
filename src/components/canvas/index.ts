"use client";

import dynamic from "next/dynamic";

export type {
  MoodboardDraft,
  MoodboardElement,
  MoodboardTool,
  StickerAssetId,
} from "@/components/canvas/types";
export {
  EXPORT_PIXEL_RATIO,
  MOODBOARD_HEIGHT,
  MOODBOARD_WIDTH,
} from "@/components/canvas/types";
export { STICKER_ASSETS } from "@/components/canvas/sticker-assets";
export { useMoodboard } from "@/components/canvas/useMoodboard";

// react-konva 는 SSR 불가 → 반드시 ssr:false 로 로드.
// 페이지에서: import { BoardCanvas } from "@/components/canvas";
export const BoardCanvas = dynamic(() => import("./BoardCanvas"), {
  ssr: false,
});
