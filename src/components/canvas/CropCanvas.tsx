"use client";

import type Konva from "konva";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Group, Image as KonvaImage, Layer, Rect, Stage } from "react-konva";

import { compositeOnWhite } from "@/components/canvas/composite-on-white";
import { createBlurredBackground } from "@/components/canvas/crop-background";
import { getCropFit, getCropShapePath } from "@/components/canvas/crop-shapes";
import {
  clampTransform,
  getCenteredTransform,
  getImagePlacement,
  type ImageMetrics,
  zoomAtPoint,
} from "@/components/canvas/crop-transform";
import {
  CROP_SIZE,
  type CropBackground,
  type CropShapeId,
  type CropTransform,
  EXPORT_PIXEL_RATIO,
} from "@/components/canvas/types";

export type CropExportFormat = "png" | "jpeg";
export type CropExporter = (format: CropExportFormat) => Promise<string | null>;

type Props = {
  baseImageUrl: string;
  shape: CropShapeId;
  background: CropBackground;
  transform: CropTransform;
  onTransformChange: (transform: CropTransform) => void;
  onImageLoad: (image: HTMLImageElement) => void;
  onImageError: () => void;
  onExportReady: (exporter: CropExporter) => void;
};

function useCanvasImage(src: string, onError: () => void) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [status, setStatus] = useState<"loading" | "loaded" | "error">(
    "loading",
  );

  // onError는 부모의 인라인 콜백이라 매 렌더 새 참조 — effect deps에 넣으면 이미지가
  // 매 렌더 재로드되며 무한 루프(Maximum update depth)가 난다. ref로 미러링해 src에만 반응.
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    if (!src) return;

    let cancelled = false;
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (cancelled) return;
      setImage(img);
      setStatus("loaded");
    };
    img.onerror = () => {
      if (cancelled) return;
      setImage(null);
      setStatus("error");
      onErrorRef.current();
    };
    img.src = src;

    return () => {
      cancelled = true;
    };
  }, [src]);

  return { image, status };
}

type Gesture =
  | { mode: "pan"; startX: number; startY: number; start: CropTransform }
  | {
      mode: "pinch";
      startDist: number;
      focalX: number;
      focalY: number;
      start: CropTransform;
    };

export default function CropCanvas({
  baseImageUrl,
  shape,
  background,
  transform,
  onTransformChange,
  onImageLoad,
  onImageError,
  onExportReady,
}: Props) {
  const stageRef = useRef<Konva.Stage>(null);
  const gestureRef = useRef<Gesture | null>(null);
  const [displayScale, setDisplayScale] = useState(1);
  const { image, status } = useCanvasImage(baseImageUrl, onImageError);

  const metrics = useMemo<ImageMetrics | null>(
    () =>
      image
        ? {
            naturalWidth: image.naturalWidth,
            naturalHeight: image.naturalHeight,
          }
        : null,
    [image],
  );

  // "크롭 안 함"은 contain(원본 전체), 도형 크롭은 cover.
  const fit = getCropFit(shape);

  // 블러 배경 — 원본 이미지를 확대·블러한 캔버스. 배경 탭에서 선택할 때만 그린다.
  const blurredBackground = useMemo(
    () => (image ? createBlurredBackground(image, CROP_SIZE) : null),
    [image],
  );

  // 최신 값을 이벤트 핸들러에서 stale 없이 읽기 위한 ref 미러. commit 이후 effect에서 동기화한다.
  const transformRef = useRef(transform);
  const metricsRef = useRef(metrics);
  const scaleRef = useRef(displayScale);
  useEffect(() => {
    transformRef.current = transform;
  }, [transform]);
  useEffect(() => {
    metricsRef.current = metrics;
  }, [metrics]);
  useEffect(() => {
    scaleRef.current = displayScale;
  }, [displayScale]);

  // 이미지 로드 시 중앙 정렬 + 팔레트 추출을 부모에 알린다.
  const handledImageRef = useRef<HTMLImageElement | null>(null);
  useEffect(() => {
    if (!image || !metrics) return;
    if (handledImageRef.current === image) return;
    handledImageRef.current = image;
    onTransformChange(getCenteredTransform(metrics, CROP_SIZE, fit));
    onImageLoad(image);
  }, [image, metrics, fit, onImageLoad, onTransformChange]);

  // 도형이 바뀌어 fit(cover↔contain)이 달라지면 현재 transform을 새 기준으로 다시 clamp한다.
  // (도형 변경 시 위치·확대는 유지 — mood-edit PRD §7 "도형 크롭")
  useEffect(() => {
    const meta = metricsRef.current;
    if (!meta) return;
    onTransformChange(
      clampTransform(transformRef.current, meta, CROP_SIZE, fit),
    );
  }, [fit, onTransformChange]);

  useEffect(() => {
    const syncScale = () => {
      const availableWidth = Math.min(window.innerWidth - 32, 420);
      const availableHeight = Math.max(window.innerHeight - 320, 260);
      const displaySize = Math.min(availableWidth, availableHeight);
      setDisplayScale(displaySize / CROP_SIZE);
    };

    syncScale();
    window.addEventListener("resize", syncScale);
    return () => window.removeEventListener("resize", syncScale);
  }, []);

  const placement = useMemo(
    () =>
      metrics ? getImagePlacement(transform, metrics, CROP_SIZE, fit) : null,
    [metrics, transform, fit],
  );

  useEffect(() => {
    const exporter: CropExporter = async (format) => {
      const stage = stageRef.current;
      if (!stage) return null;
      // display 크기와 무관하게 항상 CROP_SIZE * EXPORT_PIXEL_RATIO 해상도로 내보낸다.
      const pixelRatio = EXPORT_PIXEL_RATIO / scaleRef.current;
      const pngDataUrl = stage.toDataURL({ pixelRatio, mimeType: "image/png" });
      if (format === "png") return pngDataUrl;
      return compositeOnWhite(pngDataUrl);
    };
    onExportReady(exporter);
  }, [onExportReady]);

  // ----- 제스처 좌표 헬퍼 -----
  const toFramePoint = useCallback((clientX: number, clientY: number) => {
    const container = stageRef.current?.container();
    if (!container) return null;
    const rect = container.getBoundingClientRect();
    const scale = scaleRef.current;
    return {
      x: (clientX - rect.left) / scale,
      y: (clientY - rect.top) / scale,
    };
  }, []);

  const commitTransform = useCallback(
    (next: CropTransform) => {
      const meta = metricsRef.current;
      if (!meta) return;
      onTransformChange(clampTransform(next, meta, CROP_SIZE, fit));
    },
    [onTransformChange, fit],
  );

  // ----- 포인터(마우스) 드래그 -----
  const handleMouseDown = (event: Konva.KonvaEventObject<MouseEvent>) => {
    if (!metricsRef.current) return;
    const point = toFramePoint(event.evt.clientX, event.evt.clientY);
    if (!point) return;
    gestureRef.current = {
      mode: "pan",
      startX: point.x,
      startY: point.y,
      start: transformRef.current,
    };
  };

  const handleMouseMove = (event: Konva.KonvaEventObject<MouseEvent>) => {
    const gesture = gestureRef.current;
    if (gesture?.mode !== "pan") return;
    const point = toFramePoint(event.evt.clientX, event.evt.clientY);
    if (!point) return;
    commitTransform({
      zoom: gesture.start.zoom,
      offsetX: gesture.start.offsetX + (point.x - gesture.startX),
      offsetY: gesture.start.offsetY + (point.y - gesture.startY),
    });
  };

  const endGesture = () => {
    gestureRef.current = null;
  };

  // ----- 휠 줌 -----
  const handleWheel = (event: Konva.KonvaEventObject<WheelEvent>) => {
    event.evt.preventDefault();
    const meta = metricsRef.current;
    if (!meta) return;
    const point = toFramePoint(event.evt.clientX, event.evt.clientY);
    if (!point) return;
    const current = transformRef.current;
    const factor = event.evt.deltaY < 0 ? 1.08 : 1 / 1.08;
    // 빠른 연속 스크롤에서 배율이 정확히 누적되도록 ref를 즉시 최신화한다(effect 반영 전 방어).
    const next = zoomAtPoint(
      current,
      meta,
      CROP_SIZE,
      current.zoom * factor,
      point.x,
      point.y,
      fit,
    );
    transformRef.current = next;
    onTransformChange(next);
  };

  // ----- 터치: 1지점 팬 / 2지점 핀치 -----
  const touchDistance = (touches: TouchList) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.hypot(dx, dy);
  };

  const handleTouchStart = (event: Konva.KonvaEventObject<TouchEvent>) => {
    if (!metricsRef.current) return;
    const touches = event.evt.touches;
    if (touches.length >= 2) {
      const midClientX = (touches[0].clientX + touches[1].clientX) / 2;
      const midClientY = (touches[0].clientY + touches[1].clientY) / 2;
      const focal = toFramePoint(midClientX, midClientY);
      if (!focal) return;
      gestureRef.current = {
        mode: "pinch",
        startDist: touchDistance(touches),
        focalX: focal.x,
        focalY: focal.y,
        start: transformRef.current,
      };
      return;
    }
    const point = toFramePoint(touches[0].clientX, touches[0].clientY);
    if (!point) return;
    gestureRef.current = {
      mode: "pan",
      startX: point.x,
      startY: point.y,
      start: transformRef.current,
    };
  };

  const handleTouchMove = (event: Konva.KonvaEventObject<TouchEvent>) => {
    const gesture = gestureRef.current;
    const meta = metricsRef.current;
    if (!gesture || !meta) return;
    event.evt.preventDefault();
    const touches = event.evt.touches;

    if (gesture.mode === "pinch" && touches.length >= 2) {
      const ratio = touchDistance(touches) / gesture.startDist;
      onTransformChange(
        zoomAtPoint(
          gesture.start,
          meta,
          CROP_SIZE,
          gesture.start.zoom * ratio,
          gesture.focalX,
          gesture.focalY,
          fit,
        ),
      );
      return;
    }

    if (gesture.mode === "pan" && touches.length === 1) {
      const point = toFramePoint(touches[0].clientX, touches[0].clientY);
      if (!point) return;
      commitTransform({
        zoom: gesture.start.zoom,
        offsetX: gesture.start.offsetX + (point.x - gesture.startX),
        offsetY: gesture.start.offsetY + (point.y - gesture.startY),
      });
    }
  };

  // 더블탭/더블클릭 → 기본 위치로 초기화 (mood-edit PRD §7).
  const handleReset = () => {
    const meta = metricsRef.current;
    if (!meta) return;
    gestureRef.current = null;
    onTransformChange(getCenteredTransform(meta, CROP_SIZE, fit));
  };

  const stagePixelSize = CROP_SIZE * displayScale;
  const isTransparent = background.type === "transparent";

  return (
    <div
      className="relative touch-none select-none"
      style={{ width: stagePixelSize, height: stagePixelSize }}
      data-testid="crop-canvas"
    >
      {/* 투명 배경일 때만 체크보드를 미리보기로 노출 — export에는 포함되지 않는다. */}
      {isTransparent ? (
        <div
          aria-hidden
          className="0 absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(45deg, #d4d4d4 25%, transparent 25%), linear-gradient(-45deg, #d4d4d4 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #d4d4d4 75%), linear-gradient(-45deg, transparent 75%, #d4d4d4 75%)",
            backgroundSize: "18px 18px",
            backgroundPosition: "0 0, 0 9px, 9px -9px, -9px 0",
            backgroundColor: "#ffffff",
          }}
        />
      ) : null}
      <Stage
        ref={stageRef}
        width={stagePixelSize}
        height={stagePixelSize}
        scaleX={displayScale}
        scaleY={displayScale}
        className="0 relative"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={endGesture}
        onMouseLeave={endGesture}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={endGesture}
        onDblClick={handleReset}
        onDblTap={handleReset}
      >
        <Layer listening={false}>
          {background.type === "solid" ? (
            <Rect
              x={0}
              y={0}
              width={CROP_SIZE}
              height={CROP_SIZE}
              fill={background.color}
            />
          ) : null}
          {background.type === "blur" && blurredBackground ? (
            <KonvaImage
              image={blurredBackground}
              x={0}
              y={0}
              width={CROP_SIZE}
              height={CROP_SIZE}
            />
          ) : null}
        </Layer>
        <Layer listening={false}>
          <Group
            clipFunc={
              shape === "none"
                ? undefined
                : (ctx) => getCropShapePath(shape)(ctx, CROP_SIZE)
            }
          >
            {image && placement ? (
              <KonvaImage
                image={image}
                x={placement.x}
                y={placement.y}
                width={placement.width}
                height={placement.height}
              />
            ) : null}
          </Group>
        </Layer>
      </Stage>
      {status === "loading" ? (
        <div className="0 absolute inset-0 flex items-center justify-center text-sm font-bold text-gray-700">
          이미지를 불러오는 중
        </div>
      ) : null}
    </div>
  );
}
