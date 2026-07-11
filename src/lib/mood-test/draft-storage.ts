// 진행 중인 추구미 테스트를 localStorage 에 보존한다 (PRD §5.7 — 진행 상태는 클라이언트 보존).
//
// 드래프트는 버전 두 개를 함께 적는다:
//   - schemaVersion       이 파일이 정하는 드래프트 "구조"가 바뀌면 올린다
//   - questionSetVersion  seed.ts 의 카드·그림자·전환 "내용"이 바뀌면 올린다 (seed.ts 가 단일 출처)
//
// 둘 중 하나라도 지금 값과 다르면 이어갈 수 없다 — 예전에 고른 카드가 새 세트에 없을 수 있다.
// 손상된 JSON 도 같은 길로 보낸다. 어느 쪽이든 던지지 않고 "못 쓰는 드래프트(stale)"로 알린다.

import { z } from "zod";

import { committedStateSchema } from "@/lib/mood-test/flow-state";
import { QUESTION_SET_VERSION } from "@/lib/mood-test/seed";

const STORAGE_KEY = "mood-me:test-draft:v1";

/** 드래프트 구조가 바뀌면 올린다 (필드 추가·의미 변경 등). */
export const DRAFT_SCHEMA_VERSION = 1;

const moodTestDraftSchema = z.object({
  schemaVersion: z.literal(DRAFT_SCHEMA_VERSION),
  questionSetVersion: z.literal(QUESTION_SET_VERSION),
  sessionId: z.string().min(1),
  stepIndex: z.number().int().min(0), // 화면 번호 — 이어하기 라벨·딥링크의 단일 출처
  committed: committedStateSchema, // 단계별 완료본
  screenDraft: z.array(z.string()), // stepIndex 화면에서 진행 중이던 선택
  updatedAt: z.string().min(1),
});

export type MoodTestDraft = z.infer<typeof moodTestDraftSchema>;

/**
 * 드래프트를 읽은 결과.
 *
 * `none`(없음)과 `stale`(있는데 못 씀)을 구분하는 이유: 못 쓰는 드래프트를 조용히 버리면
 * 진행하던 사용자가 영문도 모른 채 처음 화면으로 돌아간다. 테스트 화면은 `stale` 일 때
 * 안내 모달을 띄운다.
 */
export type MoodTestDraftResult =
  | { status: "none" }
  | { status: "stale" }
  | { status: "ok"; draft: MoodTestDraft };

export function loadMoodTestDraft(): MoodTestDraftResult {
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    // 프라이빗 모드 등 저장소 접근 불가 — 드래프트가 없는 것과 같게 다룬다.
    return { status: "none" };
  }

  if (!raw) return { status: "none" };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { status: "stale" };
  }

  const result = moodTestDraftSchema.safeParse(parsed);
  if (!result.success) return { status: "stale" };

  return { status: "ok", draft: result.data };
}

export function saveMoodTestDraft(
  draft: Omit<
    MoodTestDraft,
    "schemaVersion" | "questionSetVersion" | "updatedAt"
  >,
) {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...draft,
        schemaVersion: DRAFT_SCHEMA_VERSION,
        questionSetVersion: QUESTION_SET_VERSION,
        updatedAt: new Date().toISOString(),
      } satisfies MoodTestDraft),
    );
  } catch {
    // 저장소 접근 불가·용량 초과 — 저장만 건너뛴다. 테스트 진행은 막지 않는다 (PRD §10.2).
  }
}

export function clearMoodTestDraft() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // 지울 수 없으면 그대로 둔다 — 다음 읽기에서 stale 로 걸러진다.
  }
}
