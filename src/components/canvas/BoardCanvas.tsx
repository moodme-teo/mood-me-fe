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
  Transformer,
} from "react-konva";

import { getStickerAsset } from "@/components/canvas/sticker-assets";
import {
  EXPORT_PIXEL_RATIO,
  MOODBOARD_HEIGHT,
  MOODBOARD_WIDTH,
} from "@/components/canvas/types";
import type {
  MoodboardElement,
  MoodboardTool,
  StickerAssetId,
} from "@/components/canvas/types";

type Props = {
  baseImageUrl: string;
  elements: MoodboardElement[];
  selectedId: string | null;
  tool: MoodboardTool;
  penStyle: { stroke: string; strokeWidth: number };
  onAddPen: (points: number[]) => void;
  onBaseImageError: () => void;
  onBeginTextEdit: (id: string) => void;
  onExportReady?: (exportImage: () => string | null) => void;
  onRemoveElement: (id: string) => void;
  onSelectElement: (id: string | null) => void;
  onUpdateElement: (
    id: string,
    patch: Partial<MoodboardElement>,
    pushHistory?: boolean,
  ) => void;
};

function useCanvasImage(src: string, onError: () => void) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "loaded" | "error">(
    "loading",
  );

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
      onError();
    };
    img.src = src;

    return () => {
      cancelled = true;
    };
  }, [onError, src]);

  return { image, status };
}

function getCoverCrop(image: HTMLImageElement) {
  const imageRatio = image.width / image.height;
  const stageRatio = MOODBOARD_WIDTH / MOODBOARD_HEIGHT;

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

function ElementNode({
  element,
  isSelected,
  tool,
  onBeginTextEdit,
  onRemoveElement,
  onSelectElement,
  onUpdateElement,
  registerNode,
}: {
  element: MoodboardElement;
  isSelected: boolean;
  tool: MoodboardTool;
  onBeginTextEdit: (id: string) => void;
  onRemoveElement: (id: string) => void;
  onSelectElement: (id: string | null) => void;
  onUpdateElement: (
    id: string,
    patch: Partial<MoodboardElement>,
    pushHistory?: boolean,
  ) => void;
  registerNode: (id: string, node: Konva.Node | null) => void;
}) {
  // 타일/AI 컷 요소만 이미지를 로드한다 — 나머지 타입은 빈 src로 훅을 호출해
  // Rules of Hooks를 지키면서 useCanvasImage 내부의 `if (!src) return`으로 스킵시킨다.
  const { image: elementImage } = useCanvasImage(
    element.type === "image" ? element.properties.src : "",
    () => {},
  );

  const commonProps = {
    id: element.id,
    x: element.x,
    y: element.y,
    rotation: element.rotation,
    scaleX: element.scaleX,
    scaleY: element.scaleY,
    draggable: tool === "move",
    onClick: () => {
      if (tool === "eraser") {
        onRemoveElement(element.id);
        return;
      }
      onSelectElement(element.id);
    },
    onTap: () => {
      if (tool === "eraser") {
        onRemoveElement(element.id);
        return;
      }
      onSelectElement(element.id);
    },
    onDblClick: () => {
      if (element.type === "text") onBeginTextEdit(element.id);
    },
    onDblTap: () => {
      if (element.type === "text") onBeginTextEdit(element.id);
    },
    onDragEnd: (event: Konva.KonvaEventObject<DragEvent>) => {
      onUpdateElement(element.id, {
        x: event.target.x(),
        y: event.target.y(),
      } as Partial<MoodboardElement>);
    },
    onTransformEnd: (event: Konva.KonvaEventObject<Event>) => {
      const node = event.target;
      onUpdateElement(element.id, {
        x: node.x(),
        y: node.y(),
        rotation: node.rotation(),
        scaleX: node.scaleX(),
        scaleY: node.scaleY(),
      } as Partial<MoodboardElement>);
    },
  };

  if (element.type === "sticker") {
    return (
      <Group
        {...commonProps}
        ref={(node) => registerNode(element.id, node)}
        opacity={tool === "eraser" ? 0.82 : 1}
      >
        <StickerShape assetId={element.properties.assetId} />
      </Group>
    );
  }

  if (element.type === "text") {
    return (
      <Text
        {...commonProps}
        ref={(node) => registerNode(element.id, node)}
        text={element.properties.content || "텍스트"}
        width={element.properties.width}
        align={element.properties.align}
        fill={element.properties.color}
        fontFamily={element.properties.fontFamily}
        fontSize={element.properties.fontSize}
        fontStyle={isSelected ? "700" : "600"}
        lineHeight={1.16}
        shadowColor="rgba(0,0,0,0.42)"
        shadowBlur={8}
        shadowOffset={{ x: 0, y: 2 }}
      />
    );
  }

  if (element.type === "image") {
    if (!elementImage) return null;
    return (
      <KonvaImage
        {...commonProps}
        ref={(node) => registerNode(element.id, node)}
        image={elementImage}
        width={element.properties.width}
        height={element.properties.height}
        cornerRadius={2}
        shadowColor="rgba(0,0,0,0.28)"
        shadowBlur={10}
        shadowOffset={{ x: 0, y: 4 }}
      />
    );
  }

  return (
    <Line
      {...commonProps}
      ref={(node) => registerNode(element.id, node)}
      points={element.properties.points}
      stroke={element.properties.stroke}
      strokeWidth={element.properties.strokeWidth}
      tension={0.45}
      lineCap="round"
      lineJoin="round"
      hitStrokeWidth={Math.max(18, element.properties.strokeWidth + 12)}
    />
  );
}

export default function BoardCanvas({
  baseImageUrl,
  elements,
  selectedId,
  tool,
  penStyle,
  onAddPen,
  onBaseImageError,
  onBeginTextEdit,
  onExportReady,
  onRemoveElement,
  onSelectElement,
  onUpdateElement,
}: Props) {
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const nodeRefs = useRef(new Map<string, Konva.Node>());
  const [scale, setScale] = useState(1);
  const [draftPoints, setDraftPoints] = useState<number[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const { image, status } = useCanvasImage(baseImageUrl, onBaseImageError);

  const imageCrop = useMemo(
    () => (image ? getCoverCrop(image) : null),
    [image],
  );
  const sortedElements = useMemo(
    () => [...elements].sort((a, b) => a.z_index - b.z_index),
    [elements],
  );

  useEffect(() => {
    const syncScale = () => {
      const availableWidth = Math.min(window.innerWidth - 32, 520);
      const availableHeight = Math.max(window.innerHeight - 250, 360);
      setScale(
        Math.min(
          availableWidth / MOODBOARD_WIDTH,
          availableHeight / MOODBOARD_HEIGHT,
        ),
      );
    };

    syncScale();
    window.addEventListener("resize", syncScale);
    return () => window.removeEventListener("resize", syncScale);
  }, []);

  useEffect(() => {
    const selectedNode = selectedId ? nodeRefs.current.get(selectedId) : null;
    if (!selectedNode || tool !== "move") {
      transformerRef.current?.nodes([]);
      transformerRef.current?.getLayer()?.batchDraw();
      return;
    }

    transformerRef.current?.nodes([selectedNode]);
    transformerRef.current?.getLayer()?.batchDraw();
  }, [selectedId, sortedElements, tool]);

  useEffect(() => {
    onExportReady?.(() => {
      const transformer = transformerRef.current;
      transformer?.hide();
      transformer?.getLayer()?.batchDraw();
      const dataUrl =
        stageRef.current?.toDataURL({ pixelRatio: EXPORT_PIXEL_RATIO }) ?? null;
      transformer?.show();
      transformer?.getLayer()?.batchDraw();
      return dataUrl;
    });
  }, [onExportReady]);

  const registerNode = (id: string, node: Konva.Node | null) => {
    if (!node) {
      nodeRefs.current.delete(id);
      return;
    }
    nodeRefs.current.set(id, node);
  };

  const getPointer = () => {
    const pointer = stageRef.current?.getPointerPosition();
    if (!pointer) return null;
    return {
      x: Math.max(0, Math.min(MOODBOARD_WIDTH, pointer.x / scale)),
      y: Math.max(0, Math.min(MOODBOARD_HEIGHT, pointer.y / scale)),
    };
  };

  const handleStagePointerDown = (event: Konva.KonvaEventObject<Event>) => {
    if (tool === "pen") {
      const pointer = getPointer();
      if (!pointer) return;
      setIsDrawing(true);
      setDraftPoints([pointer.x, pointer.y]);
      return;
    }

    if (event.target === event.target.getStage()) {
      onSelectElement(null);
    }
  };

  const handleStagePointerMove = () => {
    if (!isDrawing || tool !== "pen") return;
    const pointer = getPointer();
    if (!pointer) return;
    setDraftPoints((current) => [...current, pointer.x, pointer.y]);
  };

  const handleStagePointerUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    onAddPen(draftPoints);
    setDraftPoints([]);
  };

  return (
    <div className="relative mx-auto" data-testid="board-canvas">
      <Stage
        ref={stageRef}
        width={MOODBOARD_WIDTH * scale}
        height={MOODBOARD_HEIGHT * scale}
        scaleX={scale}
        scaleY={scale}
        className="overflow-hidden rounded-[22px] bg-neutral-950 shadow-[0_14px_30px_rgba(0,0,0,0.24)]"
        onMouseDown={handleStagePointerDown}
        onMouseMove={handleStagePointerMove}
        onMouseUp={handleStagePointerUp}
        onTouchStart={handleStagePointerDown}
        onTouchMove={handleStagePointerMove}
        onTouchEnd={handleStagePointerUp}
      >
        <Layer listening={false}>
          <Rect
            x={0}
            y={0}
            width={MOODBOARD_WIDTH}
            height={MOODBOARD_HEIGHT}
            fill="#18181b"
          />
          {image && imageCrop ? (
            <KonvaImage
              image={image}
              x={0}
              y={0}
              width={MOODBOARD_WIDTH}
              height={MOODBOARD_HEIGHT}
              crop={imageCrop}
            />
          ) : null}
          {status === "loading" ? (
            <Text
              x={0}
              y={MOODBOARD_HEIGHT / 2 - 14}
              width={MOODBOARD_WIDTH}
              align="center"
              fill="#ffffff"
              fontSize={16}
              fontStyle="700"
              text="무드보드를 불러오는 중"
            />
          ) : null}
        </Layer>

        <Layer>
          {sortedElements.map((element) => (
            <ElementNode
              key={element.id}
              element={element}
              isSelected={element.id === selectedId}
              tool={tool}
              onBeginTextEdit={onBeginTextEdit}
              onRemoveElement={onRemoveElement}
              onSelectElement={onSelectElement}
              onUpdateElement={onUpdateElement}
              registerNode={registerNode}
            />
          ))}
          {draftPoints.length > 0 ? (
            <Line
              points={draftPoints}
              stroke={penStyle.stroke}
              strokeWidth={penStyle.strokeWidth}
              tension={0.45}
              lineCap="round"
              lineJoin="round"
            />
          ) : null}
        </Layer>

        <Layer>
          <Transformer
            ref={transformerRef}
            rotateEnabled
            enabledAnchors={[
              "top-left",
              "top-right",
              "bottom-left",
              "bottom-right",
            ]}
            boundBoxFunc={(oldBox, newBox) => {
              if (newBox.width < 18 || newBox.height < 18) return oldBox;
              return newBox;
            }}
            borderStroke="#ffffff"
            borderStrokeWidth={1.5}
            anchorFill="#ffffff"
            anchorStroke="#171717"
            anchorSize={12}
          />
        </Layer>
      </Stage>
    </div>
  );
}
