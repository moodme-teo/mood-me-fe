"use client";

import dynamic from "next/dynamic";

export type {
  CropBackground,
  CropShapeId,
  CropState,
  CropTransform,
  MoodboardDraft,
  MoodboardElement,
  StickerAssetId,
} from "@/components/canvas/types";
export {
  CROP_SIZE,
  EXPORT_PIXEL_RATIO,
  MOODBOARD_HEIGHT,
  MOODBOARD_WIDTH,
} from "@/components/canvas/types";
export { CROP_SHAPES } from "@/components/canvas/crop-shapes";
export { extractPalette } from "@/components/canvas/extract-palette";
export {
  getCenteredTransform,
  zoomAtPoint,
  MAX_ZOOM,
  MIN_ZOOM,
  type ImageMetrics,
} from "@/components/canvas/crop-transform";
export {
  useCropEditor,
  type CropEditorApi,
} from "@/components/canvas/useCropEditor";
export type {
  CropExporter,
  CropExportFormat,
} from "@/components/canvas/CropCanvas";

// react-konva 는 SSR 불가 → 반드시 ssr:false 로 로드.
// 크롭 편집 페이지에서: import { CropCanvas } from "@/components/canvas";
export const CropCanvas = dynamic(() => import("./CropCanvas"), {
  ssr: false,
});

// 결과물 페이지의 읽기 전용 뷰어.
// import { BoardPreview } from "@/components/canvas";
export const BoardPreview = dynamic(() => import("./BoardPreview"), {
  ssr: false,
});
