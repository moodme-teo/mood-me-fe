"use client";

import type { CropTransform } from "@/components/canvas/types";

// 크롭 뷰포트 순수 계산 — 이미지가 프레임을 항상 덮도록(cover) 배율·이동을 제한한다.
// (mood-edit PRD §7 "크롭 영역 밖이 비어 보이지 않도록 최소 확대값 제한")

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 6;

export type ImageMetrics = {
  naturalWidth: number;
  naturalHeight: number;
};

// zoom=1일 때 프레임을 꽉 채우는 cover 배율.
export function getCoverScale(image: ImageMetrics, frame: number) {
  return Math.max(frame / image.naturalWidth, frame / image.naturalHeight);
}

// 현재 transform에서 이미지가 그려질 위치·크기(프레임 좌표계).
export function getImagePlacement(
  transform: CropTransform,
  image: ImageMetrics,
  frame: number,
) {
  const scale = getCoverScale(image, frame) * transform.zoom;
  return {
    x: transform.offsetX,
    y: transform.offsetY,
    width: image.naturalWidth * scale,
    height: image.naturalHeight * scale,
  };
}

// zoom을 [MIN,MAX]로, offset을 이미지가 프레임을 덮는 범위로 가둔다.
export function clampTransform(
  transform: CropTransform,
  image: ImageMetrics,
  frame: number,
): CropTransform {
  const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, transform.zoom));
  const scale = getCoverScale(image, frame) * zoom;
  const displayWidth = image.naturalWidth * scale;
  const displayHeight = image.naturalHeight * scale;

  const clampAxis = (offset: number, display: number) => {
    const min = frame - display; // <= 0
    if (min >= 0) return 0; // display가 frame보다 작을 일은 없지만 방어적으로.
    return Math.min(0, Math.max(min, offset));
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
): CropTransform {
  const scale = getCoverScale(image, frame);
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
): CropTransform {
  const coverScale = getCoverScale(image, frame);
  const scaleBefore = coverScale * transform.zoom;
  const clampedZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, nextZoom));
  const scaleAfter = coverScale * clampedZoom;

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
  );
}
