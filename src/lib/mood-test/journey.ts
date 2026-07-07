// 추구미 테스트 여정 로그 — 완료된 세션이 한 번에 보내는 답변 스키마.
// docs/work/todo/mood-test-questions.md "로깅 스키마" 절 그대로. Zod가 타입의 원천 (docs/convention/type.md).

import { z } from "zod";

const transitionSchema = z.object({
  shadow: z.string(),
  picked: z.string(),
});

function sameSet(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  const setA = new Set(a);
  if (setA.size !== a.length) return false; // 중복 원소 방지
  const setB = new Set(b);
  if (setB.size !== b.length) return false;
  for (const item of setA) if (!setB.has(item)) return false;
  return true;
}

export const journeySchema = z
  .object({
    selected: z.array(z.string()).length(12),
    dropped_r1: z.array(z.string()).length(4),
    dropped_r2: z.array(z.string()).length(3),
    survivors: z.array(z.string()).length(5),
    shadows: z.array(z.string()).length(3),
    transitions: z.array(transitionSchema).length(3),
    final: z.array(z.string()).length(5),
    dropped_final: z.array(z.string()).length(3),
    toggles: z.record(z.string(), z.number()),
    toggle_count: z.number(),
  })
  .superRefine((journey, ctx) => {
    // selected(12) = dropped_r1(4) + dropped_r2(3) + survivors(5) — 세 그룹이 selected를 정확히 분할해야 함
    const partition = [
      ...journey.dropped_r1,
      ...journey.dropped_r2,
      ...journey.survivors,
    ];
    if (!sameSet(partition, journey.selected)) {
      ctx.addIssue({
        code: "custom",
        message:
          "dropped_r1 + dropped_r2 + survivors의 합집합이 selected와 일치해야 합니다",
        path: ["selected"],
      });
    }

    // transitions ↔ shadows 1:1 — 고른 그림자 3개와 전환 응답 3개의 그림자 id가 정확히 일치해야 함
    const transitionShadows = journey.transitions.map((t) => t.shadow);
    if (!sameSet(transitionShadows, journey.shadows)) {
      ctx.addIssue({
        code: "custom",
        message: "transitions의 shadow 목록이 shadows와 1:1로 일치해야 합니다",
        path: ["transitions"],
      });
    }

    // final(5) + dropped_final(3) = survivors ∪ transitions.picked (확신 5 + 열망 3 = 8장 중 최종 대결)
    const showdownPool = [
      ...journey.survivors,
      ...journey.transitions.map((t) => t.picked),
    ];
    const finalPartition = [...journey.final, ...journey.dropped_final];
    if (!sameSet(finalPartition, showdownPool)) {
      ctx.addIssue({
        code: "custom",
        message:
          "final + dropped_final의 합집합이 survivors + transitions.picked(8장)와 일치해야 합니다",
        path: ["final"],
      });
    }
  });

export type Journey = z.infer<typeof journeySchema>;

// 검증 함수 반환 형태 통일: { ok: true, value } | { ok: false, error } (docs/convention/type.md)
export function validateJourney(
  input: unknown,
): { ok: true; value: Journey } | { ok: false; error: string } {
  const result = journeySchema.safeParse(input);
  if (!result.success) {
    const message = result.error.issues
      .map((issue) => issue.message)
      .join("; ");
    return { ok: false, error: message };
  }
  return { ok: true, value: result.data };
}
