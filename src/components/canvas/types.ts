"use client";

import type { SvgCropShapeId } from "@/components/canvas/crop-svg-shapes";

export const MOODBOARD_WIDTH = 360;
export const MOODBOARD_HEIGHT = 640;
export const EXPORT_PIXEL_RATIO = 2;

// 크롭 에디터 규격 — 정사각 프레임(1:1). 논리 좌표 CROP_SIZE 위에서 편집하고
// export는 CROP_SIZE * EXPORT_PIXEL_RATIO(=720px) 해상도로 내보낸다. (mood-edit PRD §11)
export const CROP_SIZE = 360;

// 크롭 도형 (mood-edit PRD §3.2). "none"은 크롭 없이 원본 전체 보기(contain).
// 기본 도형 + docs/assets 추출 SVG 도형(SvgCropShapeId).
export type BuiltinCropShapeId =
  | "none"
  | "circle"
  | "ellipse"
  | "square"
  | "rounded-square"
  | "capsule-v"
  | "capsule-h"
  | "star"
  | "heart"
  | "diamond";

export type CropShapeId = BuiltinCropShapeId | SvgCropShapeId;

// 배경 (mood-edit PRD §3.3 / §3.4). transparent는 export 시 알파 유지(PNG),
// solid는 color를 프레임 전체에 칠한다. blur는 원본 이미지를 확대·블러 처리해
// 이미지 색감이 배어나는 배경을 만든다 (mood-edit PRD §3.4 레퍼런스 톤 배경).
export type CropBackground =
  { type: "transparent" } | { type: "solid"; color: string } | { type: "blur" };

// 크롭 편집의 직렬화 가능한 진실의 원천 — Konva 노드가 아니라 이 값이 원본이다(canvas.md).
// zoom은 cover 배율의 배수(≥1), offset은 프레임 좌표계에서 이미지 좌상단 위치.
export type CropTransform = {
  zoom: number;
  offsetX: number;
  offsetY: number;
};

export type CropState = {
  shape: CropShapeId;
  background: CropBackground;
  transform: CropTransform;
};

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
  "silver-star" | "dream-label" | "soft-orbit" | "lucky-ribbon" | "quiet-spark";

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

// 큐레이션 타일·AI 생성 컷 등 임의 이미지 요소 (#37 — 보드 조립이 채우는 슬롯).
export type ImageElement = BaseElement & {
  type: "image";
  properties: {
    src: string;
    width: number;
    height: number;
  };
};

export type MoodboardElement =
  StickerElement | TextElement | PenElement | ImageElement;

export type MoodboardDraft = {
  moodboardId: string;
  baseImageUrl: string;
  elements: MoodboardElement[];
  updatedAt: string;
};
