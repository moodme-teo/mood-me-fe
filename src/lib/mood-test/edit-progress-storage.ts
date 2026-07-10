// 생성이 끝나 편집 화면까지 온 세션을 localStorage 에 표시한다 — 저장(결과)까지 가기 전에
// 편집 화면을 나가도, 홈 "이어서 만들기"가 이 표시를 읽어 편집 화면으로 되돌아갈 길을 연다.
//
// 편집 단계는 아직 실제 moodboard row 가 없어(저장 시 생성) 서버에는 "이어갈 목록"이 없다.
// 반면 완료된 generation job 은 sessionId 로 서버에 남아 있으므로, sessionId 만 알면
// /test/{sessionId}/edit 로 편집을 그대로 이어갈 수 있다 — 그 sessionId 를 여기 보존한다.
//
// 진행 중인 테스트 드래프트(draft-storage)와 같은 "이어서 만들기"의 재료다. 둘 중 더 최근에
// 손댄 지점을 홈이 골라 노출한다 (HomeExperience).

import { z } from "zod";

const STORAGE_KEY = "mood-me:edit-progress:v1";

/** 저장 구조가 바뀌면 올린다 (필드 추가·의미 변경 등). */
export const EDIT_PROGRESS_SCHEMA_VERSION = 1;

const editProgressSchema = z.object({
  schemaVersion: z.literal(EDIT_PROGRESS_SCHEMA_VERSION),
  sessionId: z.string().min(1),
  updatedAt: z.string().min(1), // ISO — 드래프트와 최신순을 견주는 기준
});

export type EditProgress = z.infer<typeof editProgressSchema>;

/**
 * 편집 진행 표시를 읽은 결과. 손상됐거나 없으면 똑같이 `none` 으로 다룬다 —
 * 편집 단계는 드래프트와 달리 "이어갈 수 없어 안내"할 내용이 없어, 못 읽으면 조용히 접는다.
 */
export type EditProgressResult =
  { status: "none" } | { status: "ok"; progress: EditProgress };

export function loadEditProgress(): EditProgressResult {
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    // 프라이빗 모드 등 저장소 접근 불가 — 표시가 없는 것과 같게 다룬다.
    return { status: "none" };
  }

  if (!raw) return { status: "none" };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { status: "none" };
  }

  const result = editProgressSchema.safeParse(parsed);
  if (!result.success) return { status: "none" };

  return { status: "ok", progress: result.data };
}

export function saveEditProgress(sessionId: string) {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        schemaVersion: EDIT_PROGRESS_SCHEMA_VERSION,
        sessionId,
        updatedAt: new Date().toISOString(),
      } satisfies EditProgress),
    );
  } catch {
    // 저장소 접근 불가·용량 초과 — 이어하기 표시만 못 남길 뿐 편집은 정상 진행된다.
  }
}

/**
 * 저장(결과 전환)으로 편집이 끝났을 때 호출한다.
 *
 * 다른 세션이 이미 이 자리를 덮어썼다면 지우지 않는다 — 내가 남긴 표시만 거둔다.
 * (저장된 보드 재편집처럼 sessionId 가 없는 편집은 애초에 이 표시를 남기지도 지우지도 않는다.)
 */
export function clearEditProgress(sessionId: string) {
  try {
    const current = loadEditProgress();
    if (current.status === "ok" && current.progress.sessionId !== sessionId) {
      return;
    }
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // 지울 수 없으면 그대로 둔다 — 다음 저장에서 덮이거나 다음 읽기에서 걸러진다.
  }
}
