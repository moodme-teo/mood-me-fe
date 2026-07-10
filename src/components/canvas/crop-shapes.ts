"use client";

import type Konva from "konva";

import {
  SVG_CROP_SHAPES,
  type SvgPrimitive,
} from "@/components/canvas/crop-svg-shapes";
import type { CropFit } from "@/components/canvas/crop-transform";
import type {
  BuiltinCropShapeId,
  CropShapeId,
} from "@/components/canvas/types";

// "크롭 안 함"은 원본 전체를 프레임 안에 담는 contain, 나머지 도형은 cover.
export function getCropFit(shape: CropShapeId): CropFit {
  return shape === "none" ? "contain" : "cover";
}

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

const SHAPE_PATHS: Record<BuiltinCropShapeId, ShapePath> = {
  // 크롭 없음 — 프레임 전체(마스킹 없음). CropCanvas가 clip을 생략하므로 실사용되진 않지만
  // 타입 완결성을 위해 정사각 경로를 둔다.
  none: (ctx, s) => {
    ctx.rect(0, 0, s, s);
  },
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

// SVG 프리미티브를 프레임(size)에 맞춰 스케일해 경로만 그린다. clip은 Konva가 처리.
function drawSvgPrimitive(
  ctx: Konva.Context,
  size: number,
  prim: SvgPrimitive,
  view: number,
) {
  const k = size / view;
  if (prim.t === "ellipse") {
    ctx.ellipse(
      prim.cx * k,
      prim.cy * k,
      prim.rx * k,
      prim.ry * k,
      0,
      0,
      Math.PI * 2,
      false,
    );
    return;
  }
  if (prim.t === "rect") {
    roundedRectPath(
      ctx,
      prim.x * k,
      prim.y * k,
      prim.w * k,
      prim.h * k,
      prim.rx * k,
    );
    return;
  }
  // path — 절대 명령 M/L/H/V/C/Z만 사용(자산 확인). 각 좌표를 k배로 스케일해 replay.
  const tokens = prim.d.match(/[MLHVCZ]|-?\d*\.?\d+/gi);
  if (!tokens) return;
  let i = 0;
  let cx = 0;
  let cy = 0;
  let startX = 0;
  let startY = 0;
  // 다음 토큰이 좌표 숫자인지(명령 문자가 아닌지) 판별.
  const isNum = () => {
    const t = tokens[i];
    return t !== undefined && /^-?\.?\d/.test(t);
  };
  const next = () => Number(tokens[i++]);
  while (i < tokens.length) {
    const cmd = tokens[i++];
    switch (cmd) {
      case "M":
        cx = next();
        cy = next();
        startX = cx;
        startY = cy;
        ctx.moveTo(cx * k, cy * k);
        while (isNum()) {
          cx = next();
          cy = next();
          ctx.lineTo(cx * k, cy * k);
        }
        break;
      case "L":
        while (isNum()) {
          cx = next();
          cy = next();
          ctx.lineTo(cx * k, cy * k);
        }
        break;
      case "H":
        while (isNum()) {
          cx = next();
          ctx.lineTo(cx * k, cy * k);
        }
        break;
      case "V":
        while (isNum()) {
          cy = next();
          ctx.lineTo(cx * k, cy * k);
        }
        break;
      case "C":
        while (isNum()) {
          const x1 = next();
          const y1 = next();
          const x2 = next();
          const y2 = next();
          cx = next();
          cy = next();
          ctx.bezierCurveTo(x1 * k, y1 * k, x2 * k, y2 * k, cx * k, cy * k);
        }
        break;
      case "Z":
        ctx.closePath();
        cx = startX;
        cy = startY;
        break;
      default:
        break;
    }
  }
}

const SVG_SHAPE_MAP = new Map(SVG_CROP_SHAPES.map((def) => [def.id, def]));

export function getCropShapePath(shape: CropShapeId): ShapePath {
  const builtin = (SHAPE_PATHS as Partial<Record<CropShapeId, ShapePath>>)[
    shape
  ];
  if (builtin) return builtin;

  const svg = SVG_SHAPE_MAP.get(
    shape as (typeof SVG_CROP_SHAPES)[number]["id"],
  );
  if (svg) {
    return (ctx, size) => {
      for (const prim of svg.shapes) {
        drawSvgPrimitive(ctx, size, prim, svg.view);
      }
    };
  }

  // 알 수 없는 도형 — 정사각으로 안전 폴백.
  return (ctx, s) => {
    ctx.rect(0, 0, s, s);
  };
}

// 하단 가로 스크롤에 노출할 도형 목록 (mood-edit PRD §3.2 · §4.2).
export const CROP_SHAPES: { id: CropShapeId; label: string }[] = [
  { id: "none", label: "크롭 안 함" },
  { id: "circle", label: "원" },
  { id: "ellipse", label: "타원" },
  { id: "square", label: "정사각형" },
  { id: "rounded-square", label: "둥근 사각형" },
  { id: "capsule-v", label: "세로 캡슐" },
  { id: "capsule-h", label: "가로 캡슐" },
  { id: "star", label: "별" },
  { id: "heart", label: "하트" },
  { id: "diamond", label: "다이아몬드" },
  ...SVG_CROP_SHAPES.map((def) => ({ id: def.id, label: def.label })),
];
