"use client";

import type Konva from "konva";
import { useRef } from "react";
import { Layer, Rect, Stage } from "react-konva";

// 페이지 5 무드보드 캔버스의 뼈대.
// 스티커/글자/이미지 노드를 Layer 안에 추가하고, exportImage() 로 내보내면 됨.
export default function BoardCanvas({
  width = 360,
  height = 640,
}: {
  width?: number;
  height?: number;
}) {
  const stageRef = useRef<Konva.Stage>(null);

  // 완성 보드를 PNG dataURL 로 내보내기 (공유 썸네일/저장용)
  const exportImage = () => stageRef.current?.toDataURL({ pixelRatio: 2 });

  return (
    <Stage ref={stageRef} width={width} height={height}>
      <Layer>
        <Rect x={0} y={0} width={width} height={height} fill="#fff" />
        {/* TODO: 드래그 가능한 스티커/텍스트/이미지 노드 추가 */}
      </Layer>
    </Stage>
  );
}
