"use client";

import { useCallback, useRef, useState } from "react";

// History 캐러셀의 단일 진실원(source of truth)은 연속 실수 `position` 하나다.
// - 정수부는 중앙에 놓인 카드, 소수부는 드래그 중 미끄러진 정도.
// - position 은 래핑하지 않고 계속 누적한다 → 다이얼 회전각이 끊김 없이 이어지고,
//   n번째에서 0번째로 넘어가도 시각적 점프가 없다(원형 순환).
// - 실제 카드 선택/배치는 이 값을 count 기준으로 되접어(wrap) 계산한다.

type DragState = {
  startX: number;
  startPosition: number;
  pxPerCard: number;
  moved: boolean;
};

// 드래그 시작으로 인정하지 않는(=탭으로 간주하는) 이동 임계값(px).
const TAP_THRESHOLD_PX = 6;

/** raw 를 [-count/2, count/2] 범위의 최단 순환 거리로 되접는다. */
export function wrapDelta(raw: number, count: number) {
  if (count <= 0) return 0;
  return raw - count * Math.round(raw / count);
}

export function useHistoryCarousel(count: number) {
  const [position, setPosition] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<DragState | null>(null);

  const activeIndex =
    count > 0 ? ((Math.round(position) % count) + count) % count : 0;

  const snap = useCallback(() => {
    setPosition((current) => Math.round(current));
  }, []);

  /** 현재 위치에서 가장 가까운 `index` 사본으로 이동(원형 최단 경로). */
  const goTo = useCallback(
    (index: number) => {
      if (count <= 0) return;
      setPosition((current) => {
        const base = Math.round(current);
        const normalized = ((base % count) + count) % count;
        return base + wrapDelta(index - normalized, count);
      });
    },
    [count],
  );

  const step = useCallback((direction: 1 | -1) => {
    setPosition((current) => Math.round(current) + direction);
  }, []);

  const beginDrag = useCallback(
    (clientX: number, pxPerCard: number) => {
      dragRef.current = {
        startX: clientX,
        startPosition: position,
        pxPerCard: pxPerCard || 1,
        moved: false,
      };
      setIsDragging(true);
    },
    [position],
  );

  const moveDrag = useCallback((clientX: number) => {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = clientX - drag.startX;
    if (Math.abs(dx) > TAP_THRESHOLD_PX) drag.moved = true;
    // 왼쪽으로 끌면(dx<0) 다음 카드(=position 증가)로 진행.
    setPosition(drag.startPosition - dx / drag.pxPerCard);
  }, []);

  /** 드래그 종료. 이동이 임계값 미만이면 탭으로 보고 true 를 반환한다. */
  const endDrag = useCallback((): boolean => {
    const drag = dragRef.current;
    dragRef.current = null;
    setIsDragging(false);
    snap();
    return drag ? !drag.moved : false;
  }, [snap]);

  return {
    position,
    activeIndex,
    isDragging,
    goTo,
    step,
    beginDrag,
    moveDrag,
    endDrag,
  };
}
