"use client";

import type Konva from "konva";

import type { CropShapeId } from "@/components/canvas/types";

// 도형 clip 경로 — 정사각 프레임(size×size)에 내접하도록 경로만 그린다.
// Konva가 clipFunc 호출 전 beginPath(), 호출 후 clip()을 대신 처리하므로
// 여기서는 path 메서드만 부른다(canvas.md · Container.js 확인). ctx.clip() 호출 금지.
type ShapePath = (ctx: Konva.Context, size: number) => void;

function roundedRectPath(
  ctx: Konva.Context,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

const SHAPE_PATHS: Record<CropShapeId, ShapePath> = {
  circle: (ctx, s) => {
    ctx.arc(s / 2, s / 2, s / 2, 0, Math.PI * 2, false);
  },
  ellipse: (ctx, s) => {
    ctx.ellipse(s / 2, s / 2, s / 2, s / 2.6, 0, 0, Math.PI * 2, false);
  },
  square: (ctx, s) => {
    ctx.rect(0, 0, s, s);
  },
  "rounded-square": (ctx, s) => {
    roundedRectPath(ctx, 0, 0, s, s, s * 0.18);
  },
  "capsule-v": (ctx, s) => {
    const width = s * 0.6;
    roundedRectPath(ctx, (s - width) / 2, 0, width, s, width / 2);
  },
  "capsule-h": (ctx, s) => {
    const height = s * 0.6;
    roundedRectPath(ctx, 0, (s - height) / 2, s, height, height / 2);
  },
  star: (ctx, s) => {
    const cx = s / 2;
    const cy = s / 2;
    const spikes = 5;
    const outer = s / 2;
    const inner = s * 0.21;
    const step = Math.PI / spikes;
    let angle = -Math.PI / 2;
    ctx.moveTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer);
    for (let i = 0; i < spikes; i += 1) {
      angle += step;
      ctx.lineTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
      angle += step;
      ctx.lineTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer);
    }
    ctx.closePath();
  },
  heart: (ctx, s) => {
    ctx.moveTo(s * 0.5, s * 0.28);
    ctx.bezierCurveTo(s * 0.5, s * 0.12, s * 0.1, s * 0.02, s * 0.05, s * 0.35);
    ctx.bezierCurveTo(
      s * 0.02,
      s * 0.55,
      s * 0.35,
      s * 0.75,
      s * 0.5,
      s * 0.95,
    );
    ctx.bezierCurveTo(
      s * 0.65,
      s * 0.75,
      s * 0.98,
      s * 0.55,
      s * 0.95,
      s * 0.35,
    );
    ctx.bezierCurveTo(s * 0.9, s * 0.02, s * 0.5, s * 0.12, s * 0.5, s * 0.28);
    ctx.closePath();
  },
  diamond: (ctx, s) => {
    ctx.moveTo(s / 2, 0);
    ctx.lineTo(s, s / 2);
    ctx.lineTo(s / 2, s);
    ctx.lineTo(0, s / 2);
    ctx.closePath();
  },
};

export function getCropShapePath(shape: CropShapeId): ShapePath {
  return SHAPE_PATHS[shape];
}

// 하단 가로 스크롤에 노출할 도형 목록 (mood-edit PRD §3.2 · §4.2).
export const CROP_SHAPES: { id: CropShapeId; label: string }[] = [
  { id: "circle", label: "원" },
  { id: "ellipse", label: "타원" },
  { id: "square", label: "정사각형" },
  { id: "rounded-square", label: "둥근 사각형" },
  { id: "capsule-v", label: "세로 캡슐" },
  { id: "capsule-h", label: "가로 캡슐" },
  { id: "star", label: "별" },
  { id: "heart", label: "하트" },
  { id: "diamond", label: "다이아몬드" },
];
