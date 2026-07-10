"use client";

import type { CropTransform } from "@/components/canvas/types";

// 크롭 뷰포트 순수 계산 — 이미지가 프레임을 덮거나(cover) 안에 들어오도록(contain) 배율·이동을 제한한다.
// cover: 크롭 도형용 — 프레임을 항상 채워 빈 영역이 없다 (mood-edit PRD §7).
// contain: "크롭 안 함" 원본 보기용 — 이미지 전체가 프레임 안에 들어온다.

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 6;

// zoom=1 기준 배율 — cover는 프레임을 채우고, contain은 이미지 전체를 담는다.
export type CropFit = "cover" | "contain";

export type ImageMetrics = {
  naturalWidth: number;
  naturalHeight: number;
};

// zoom=1일 때의 기준 배율. cover는 최대(꽉 채움), contain은 최소(전체 보임).
export function getBaseScale(image: ImageMetrics, frame: number, fit: CropFit) {
  const scaleX = frame / image.naturalWidth;
  const scaleY = frame / image.naturalHeight;
  return fit === "contain"
    ? Math.min(scaleX, scaleY)
    : Math.max(scaleX, scaleY);
}

// 현재 transform에서 이미지가 그려질 위치·크기(프레임 좌표계).
export function getImagePlacement(
  transform: CropTransform,
  image: ImageMetrics,
  frame: number,
  fit: CropFit,
) {
  const scale = getBaseScale(image, frame, fit) * transform.zoom;
  return {
    x: transform.offsetX,
    y: transform.offsetY,
    width: image.naturalWidth * scale,
    height: image.naturalHeight * scale,
  };
}

// zoom을 [MIN,MAX]로, offset을 프레임 기준으로 가둔다.
// 이미지가 프레임보다 크면 프레임을 덮도록, 작으면 프레임 안에 머물도록 clamp.
export function clampTransform(
  transform: CropTransform,
  image: ImageMetrics,
  frame: number,
  fit: CropFit,
): CropTransform {
  const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, transform.zoom));
  const scale = getBaseScale(image, frame, fit) * zoom;
  const displayWidth = image.naturalWidth * scale;
  const displayHeight = image.naturalHeight * scale;

  const clampAxis = (offset: number, display: number) => {
    const slack = frame - display;
    if (slack >= 0) {
      // 이미지가 프레임보다 작다(contain) — 프레임 안 [0, slack]에 머물게 한다.
      return Math.min(slack, Math.max(0, offset));
    }
    // 이미지가 프레임보다 크다(cover) — 프레임을 덮도록 [slack, 0]에 가둔다.
    return Math.min(0, Math.max(slack, offset));
  };

  return {
    zoom,
    offsetX: clampAxis(transform.offsetX, displayWidth),
    offsetY: clampAxis(transform.offsetY, displayHeight),
  };
}

// zoom 1, 프레임 중앙 정렬된 기본 transform.
export function getCenteredTransform(
  image: ImageMetrics,
  frame: number,
  fit: CropFit,
): CropTransform {
  const scale = getBaseScale(image, frame, fit);
  return {
    zoom: MIN_ZOOM,
    offsetX: (frame - image.naturalWidth * scale) / 2,
    offsetY: (frame - image.naturalHeight * scale) / 2,
  };
}

// 초점(focal, 프레임 좌표)을 고정한 채 zoom을 바꾼 뒤 클램프한다.
export function zoomAtPoint(
  transform: CropTransform,
  image: ImageMetrics,
  frame: number,
  nextZoom: number,
  focalX: number,
  focalY: number,
  fit: CropFit,
): CropTransform {
  const baseScale = getBaseScale(image, frame, fit);
  const scaleBefore = baseScale * transform.zoom;
  const clampedZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, nextZoom));
  const scaleAfter = baseScale * clampedZoom;

  // 초점 아래의 이미지 좌표가 그대로 유지되도록 offset을 재계산.
  const imagePointX = (focalX - transform.offsetX) / scaleBefore;
  const imagePointY = (focalY - transform.offsetY) / scaleBefore;

  return clampTransform(
    {
      zoom: clampedZoom,
      offsetX: focalX - imagePointX * scaleAfter,
      offsetY: focalY - imagePointY * scaleAfter,
    },
    image,
    frame,
    fit,
  );
}
