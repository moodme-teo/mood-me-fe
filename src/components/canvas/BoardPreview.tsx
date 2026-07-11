"use client";

import type Konva from "konva";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Circle,
  Group,
  Image as KonvaImage,
  Layer,
  Line,
  Rect,
  RegularPolygon,
  Stage,
  Star,
  Text,
} from "react-konva";

import { getStickerAsset } from "@/components/canvas/sticker-assets";
import type { MoodboardElement, StickerAssetId } from "@/types/moodboard";
import { EXPORT_PIXEL_RATIO } from "@/types/moodboard";

type Props = {
  width?: number;
  height?: number;
  baseImageUrl?: string;
  elements?: MoodboardElement[];
  onExportReady?: (exportImage: () => string | null) => void;
  onImageError?: () => void;
};

function useCanvasImage(src: string | undefined, onError?: () => void) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  // onError가 인라인 콜백이면 매 렌더 새 참조라 effect가 반복 실행되어 이미지가 계속
  // 재로드된다(Maximum update depth). ref로 미러링해 src에만 반응하도록 한다.
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
      if (!cancelled) setImage(img);
    };
    img.onerror = () => {
      if (cancelled) return;
      setImage(null);
      onErrorRef.current?.();
    };
    img.src = src;

    return () => {
      cancelled = true;
    };
  }, [src]);

  return image;
}

function getCoverCrop(image: HTMLImageElement, width: number, height: number) {
  const imageRatio = image.width / image.height;
  const stageRatio = width / height;

  if (imageRatio > stageRatio) {
    const cropWidth = image.height * stageRatio;
    return {
      x: (image.width - cropWidth) / 2,
      y: 0,
      width: cropWidth,
      height: image.height,
    };
  }

  const cropHeight = image.width / stageRatio;
  return {
    x: 0,
    y: (image.height - cropHeight) / 2,
    width: image.width,
    height: cropHeight,
  };
}

function StickerShape({ assetId }: { assetId: StickerAssetId }) {
  const asset = getStickerAsset(assetId);
  const centerX = asset.width / 2;
  const centerY = asset.height / 2;

  if (assetId === "silver-star") {
    return (
      <Star
        x={centerX}
        y={centerY}
        numPoints={5}
        innerRadius={18}
        outerRadius={36}
        fill={asset.fill}
        stroke={asset.stroke}
        strokeWidth={2}
      />
    );
  }

  if (assetId === "soft-orbit") {
    return (
      <>
        <Circle
          x={centerX}
          y={centerY}
          radius={34}
          fill="rgba(217, 246, 255, 0.72)"
          stroke={asset.stroke}
          strokeWidth={2}
        />
        <RegularPolygon
          x={centerX}
          y={centerY}
          sides={6}
          radius={18}
          fill="#ffffff"
          stroke={asset.stroke}
          strokeWidth={1.5}
        />
      </>
    );
  }

  if (assetId === "quiet-spark") {
    return (
      <RegularPolygon
        x={centerX}
        y={centerY}
        sides={4}
        radius={31}
        fill={asset.fill}
        stroke={asset.stroke}
        strokeWidth={2}
        rotation={45}
      />
    );
  }

  return (
    <>
      <Rect
        x={0}
        y={0}
        width={asset.width}
        height={asset.height}
        fill={asset.fill}
        stroke={asset.stroke}
        strokeWidth={2}
        cornerRadius={16}
      />
      <Text
        x={0}
        y={10}
        width={asset.width}
        text={asset.text}
        align="center"
        fill={asset.stroke}
        fontFamily="Arial"
        fontSize={18}
        fontStyle="700"
      />
    </>
  );
}

function ElementNode({ element }: { element: MoodboardElement }) {
  const elementImage = useCanvasImage(
    element.type === "image" ? element.properties.src : undefined,
  );

  const commonProps = {
    x: element.x,
    y: element.y,
    rotation: element.rotation,
    scaleX: element.scaleX,
    scaleY: element.scaleY,
    listening: false,
  };

  if (element.type === "image") {
    if (!elementImage) return null;
    return (
      <KonvaImage
        {...commonProps}
        image={elementImage}
        width={element.properties.width}
        height={element.properties.height}
        cornerRadius={2}
      />
    );
  }

  if (element.type === "sticker") {
    return (
      <Group {...commonProps}>
        <StickerShape assetId={element.properties.assetId} />
      </Group>
    );
  }

  if (element.type === "text") {
    return (
      <Text
        {...commonProps}
        text={element.properties.content}
        width={element.properties.width}
        align={element.properties.align}
        fill={element.properties.color}
        fontFamily={element.properties.fontFamily}
        fontSize={element.properties.fontSize}
        fontStyle="700"
        lineHeight={1.16}
        shadowColor="rgba(0,0,0,0.42)"
        shadowBlur={8}
        shadowOffset={{ x: 0, y: 2 }}
      />
    );
  }

  return (
    <Line
      {...commonProps}
      points={element.properties.points}
      stroke={element.properties.stroke}
      strokeWidth={element.properties.strokeWidth}
      tension={0.45}
      lineCap="round"
      lineJoin="round"
    />
  );
}

export default function BoardPreview({
  width = 360,
  height = 640,
  baseImageUrl,
  elements = [],
  onExportReady,
  onImageError,
}: Props) {
  const stageRef = useRef<Konva.Stage>(null);
  const image = useCanvasImage(baseImageUrl, onImageError);
  const imageCrop = useMemo(
    () => (image ? getCoverCrop(image, width, height) : null),
    [height, image, width],
  );
  const sortedElements = useMemo(
    () => [...elements].sort((a, b) => a.z_index - b.z_index),
    [elements],
  );

  useEffect(() => {
    onExportReady?.(
      () =>
        stageRef.current?.toDataURL({ pixelRatio: EXPORT_PIXEL_RATIO }) ?? null,
    );
  }, [onExportReady]);

  return (
    <Stage ref={stageRef} width={width} height={height}>
      <Layer listening={false}>
        <Rect x={0} y={0} width={width} height={height} fill="#18181b" />
        {image && imageCrop ? (
          <KonvaImage
            image={image}
            x={0}
            y={0}
            width={width}
            height={height}
            crop={imageCrop}
          />
        ) : (
          <Rect x={0} y={0} width={width} height={height} fill="#ffffff" />
        )}
      </Layer>
      <Layer listening={false}>
        {sortedElements.map((element) => (
          <ElementNode key={element.id} element={element} />
        ))}
      </Layer>
      <Layer listening={false} />
    </Stage>
  );
}
