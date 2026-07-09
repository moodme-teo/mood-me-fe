"use client";

import { Scan } from "lucide-react";
import type { ReactNode } from "react";

import {
  SVG_CROP_SHAPES,
  type SvgPrimitive,
} from "@/components/canvas/crop-svg-shapes";
import type { CropShapeId } from "@/components/canvas/types";

// 도형 선택 버튼용 실루엣 아이콘 — clip 경로와 같은 형태를 검정(currentColor) fill로 그린다.
// SVG 도형은 추출 데이터(crop-svg-shapes)를, 기본 도형은 아래 120뷰 하드코딩 실루엣을 쓴다.

const SVG_SHAPE_MAP = new Map(SVG_CROP_SHAPES.map((def) => [def.id, def]));

function PrimitiveShape({ prim }: { prim: SvgPrimitive }) {
  if (prim.t === "ellipse") {
    return <ellipse cx={prim.cx} cy={prim.cy} rx={prim.rx} ry={prim.ry} />;
  }
  if (prim.t === "rect") {
    return (
      <rect x={prim.x} y={prim.y} width={prim.w} height={prim.h} rx={prim.rx} />
    );
  }
  return <path d={prim.d} />;
}

// 5각 별 path (120뷰). Konva star clip과 같은 비율.
const STAR_PATH = (() => {
  const cx = 60;
  const cy = 60;
  const outer = 54;
  const inner = 25;
  const spikes = 5;
  const step = Math.PI / spikes;
  let angle = -Math.PI / 2;
  const pt = (r: number) =>
    `${(cx + Math.cos(angle) * r).toFixed(1)} ${(cy + Math.sin(angle) * r).toFixed(1)}`;
  let d = `M${pt(outer)}`;
  for (let i = 0; i < spikes; i += 1) {
    angle += step;
    d += `L${pt(inner)}`;
    angle += step;
    d += `L${pt(outer)}`;
  }
  return `${d}Z`;
})();

const HEART_PATH =
  "M60 33.6 C60 14.4 12 2.4 6 42 C2.4 66 42 90 60 114 C78 90 117.6 66 114 42 C108 2.4 60 14.4 60 33.6Z";

// 기본 도형 실루엣 (120뷰). "none"은 별도 처리(크롭 프레임 아이콘).
const BUILTIN_ICONS: Partial<Record<CropShapeId, ReactNode>> = {
  circle: <circle cx={60} cy={60} r={54} />,
  ellipse: <ellipse cx={60} cy={60} rx={54} ry={42} />,
  square: <rect x={8} y={8} width={104} height={104} rx={6} />,
  "rounded-square": <rect x={8} y={8} width={104} height={104} rx={24} />,
  "capsule-v": <rect x={36} y={6} width={48} height={108} rx={24} />,
  "capsule-h": <rect x={6} y={36} width={108} height={48} rx={24} />,
  star: <path d={STAR_PATH} />,
  heart: <path d={HEART_PATH} />,
  diamond: <path d="M60 6 L114 60 L60 114 L6 60Z" />,
};

export function CropShapeIcon({
  shape,
  className,
}: {
  shape: CropShapeId;
  className?: string;
}) {
  // 크롭 안 함 — 실루엣이 없으므로 프레임(스캔) 아이콘으로 대체.
  if (shape === "none") {
    return <Scan className={className} aria-hidden strokeWidth={2.25} />;
  }

  const svg = SVG_SHAPE_MAP.get(
    shape as (typeof SVG_CROP_SHAPES)[number]["id"],
  );
  const view = svg?.view ?? 120;
  const body = svg
    ? svg.shapes.map((prim, index) => (
        <PrimitiveShape key={index} prim={prim} />
      ))
    : BUILTIN_ICONS[shape];

  return (
    <svg
      viewBox={`0 0 ${view} ${view}`}
      className={className}
      fill="currentColor"
      aria-hidden
    >
      {body}
    </svg>
  );
}
