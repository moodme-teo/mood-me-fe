"use client";

// 이미지 색감이 배어나는 블러 배경 (mood-edit PRD §3.4 — 레퍼런스 톤 배경).
// 원본 이미지를 프레임에 cover-fit + 살짝 오버스캔해 그린 뒤 강하게 블러 처리한다.
// 오버스캔으로 블러 가장자리의 투명 falloff를 프레임 밖으로 밀어내 배경이 꽉 차게 한다.
// crossOrigin="anonymous"로 로드된 이미지여야 export(toDataURL)가 tainted 되지 않는다.

const BLUR_RADIUS = 28;
const OVERSCAN = 1.3;

export function createBlurredBackground(
  image: HTMLImageElement,
  size: number,
): HTMLCanvasElement | null {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const cover = Math.max(size / image.naturalWidth, size / image.naturalHeight);
  const scale = cover * OVERSCAN;
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;

  ctx.filter = `blur(${BLUR_RADIUS}px)`;
  ctx.drawImage(image, (size - width) / 2, (size - height) / 2, width, height);
  ctx.filter = "none";

  return canvas;
}
