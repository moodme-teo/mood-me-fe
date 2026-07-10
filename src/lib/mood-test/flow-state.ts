// 추구미 테스트 진행 상태의 스키마. 상태 기계 본체는 components/test/mood-test-flow.ts 지만,
// 이 상태는 localStorage 라는 런타임 경계를 넘나들므로 Zod 가 타입의 원천이다
// (docs/convention/type.md). lib → components 단방향을 지키려고 여기에 둔다.

import { z } from "zod";

export const committedTransitionSchema = z.object({
  shadow: z.string(),
  picked: z.string(),
});

export type CommittedTransition = z.infer<typeof committedTransitionSchema>;

/** 화면을 확정(CONFIRM)할 때마다 쌓이는 단계별 완료본. */
export const committedStateSchema = z.object({
  selected: z.array(z.string()), // A 완료본 (12, 담은 순서 유지)
  droppedR1: z.array(z.string()), // B1 완료본 (4)
  droppedR2: z.array(z.string()), // B2 완료본 (3)
  shadows: z.array(z.string()), // C 완료본 (3, 선택 순서 = D 화면 순서)
  // D 완료본, shadows 와 인덱스 정렬 (길이 3)
  transitions: z.array(committedTransitionSchema.nullable()).length(3),
  final: z.array(z.string()), // E 완료본 (5)
  droppedFinal: z.array(z.string()), // E 탈락 (3)
  toggles: z.record(z.string(), z.number()), // id별 담았다 뺐다 횟수 (망설임 신호)
});

export type CommittedState = z.infer<typeof committedStateSchema>;

export const INITIAL_COMMITTED: CommittedState = {
  selected: [],
  droppedR1: [],
  droppedR2: [],
  shadows: [],
  transitions: [null, null, null],
  final: [],
  droppedFinal: [],
  toggles: {},
};

/** 드래프트로 복원되는 최소 단위 — 되돌리기(UNDO) 스택은 화면 안에서만 살고 저장하지 않는다. */
export type FlowProgress = {
  screenIndex: number;
  committed: CommittedState;
  draft: string[]; // 현재 화면에서 진행 중인 선택
};
