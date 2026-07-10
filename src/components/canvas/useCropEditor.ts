"use client";

import { useCallback, useMemo, useState } from "react";

import type {
  CropBackground,
  CropShapeId,
  CropState,
  CropTransform,
} from "@/components/canvas/types";

// 크롭 편집의 직렬화 가능한 상태를 모으는 훅 (canvas.md — 진실의 원천은 Konva 노드가 아니다).
// 뷰포트 클램프는 이미지 규격이 필요하므로 CropCanvas가 crop-transform 헬퍼로 처리하고,
// 여기서는 상태 보관·갱신만 담당한다.

const DEFAULT_STATE: CropState = {
  shape: "none",
  background: { type: "transparent" },
  transform: { zoom: 1, offsetX: 0, offsetY: 0 },
};

// initialState — 재편집 진입 시 복원할 구도(#116). 없으면 DEFAULT_STATE(#117).
export function useCropEditor(initialState?: CropState) {
  const [shape, setShape] = useState<CropShapeId>(
    initialState?.shape ?? DEFAULT_STATE.shape,
  );
  const [background, setBackground] = useState<CropBackground>(
    initialState?.background ?? DEFAULT_STATE.background,
  );
  const [transform, setTransform] = useState<CropTransform>(
    initialState?.transform ?? DEFAULT_STATE.transform,
  );
  // 이미지에서 추출한 추천 팔레트 (mood-edit PRD §3.5).
  const [palette, setPalette] = useState<string[]>([]);

  const setSolidBackground = useCallback((color: string) => {
    setBackground({ type: "solid", color });
  }, []);

  const setTransparentBackground = useCallback(() => {
    setBackground({ type: "transparent" });
  }, []);

  const setBlurBackground = useCallback(() => {
    setBackground({ type: "blur" });
  }, []);

  const state = useMemo<CropState>(
    () => ({ shape, background, transform }),
    [shape, background, transform],
  );

  return {
    state,
    shape,
    background,
    transform,
    palette,
    setShape,
    setBackground,
    setSolidBackground,
    setTransparentBackground,
    setBlurBackground,
    setTransform,
    setPalette,
  };
}

export type CropEditorApi = ReturnType<typeof useCropEditor>;
