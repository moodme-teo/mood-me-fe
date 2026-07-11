// 생성이 끝나 편집 화면까지 온 세션들을 localStorage 에 표시한다 — 저장(결과)까지 가기 전에
// 편집 화면을 나가도, 홈이 이 표시를 읽어 편집 화면으로 되돌아갈 길을 연다.
//
// 편집 단계는 아직 실제 moodboard row 가 없어(저장 시 생성) 서버에는 "이어갈 목록"이 없다.
// 반면 완료된 generation job 은 sessionId 로 서버에 남아 있으므로, sessionId 만 알면
// /test/{sessionId}/edit 로 편집을 그대로 이어갈 수 있다 — 그 sessionId 들을 여기 보존한다.
//
// 여러 무드보드가 동시에 "편집 중"으로 남을 수 있다(보드1 편집 중에 새 테스트를 또 끝내는 등).
// 그래서 단일 슬롯이 아니라 sessionId 별 목록으로 담는다 — 홈은 이 목록을 "편집 중" 진입점으로
// 따로 노출한다(진행 중 테스트 드래프트 draft-storage 의 "이어서 만들기"와는 별개다).

import { z } from "zod";

const STORAGE_KEY = "mood-me:edit-progress:v2";

/** 저장 구조가 바뀌면 올린다 (필드 추가·의미 변경 등). v1 은 단일 슬롯이었다. */
export const EDIT_PROGRESS_SCHEMA_VERSION = 2;

const editProgressSchema = z.object({
  sessionId: z.string().min(1),
  updatedAt: z.string().min(1), // ISO — 최신순 정렬 기준
  // 홈 캐러셀에 편집중 카드를 바로 그리기 위한 미리보기 URL(크롭 전 원본 baseImageUrl).
  // 저장 시점에 아직 data: URL 이면(업로드 전) 용량 때문에 담지 않는다 — 없으면 카드는
  // 플레이스홀더로 뜬다. 서버 추가 요청 없이 로컬 값만으로 카드를 채우는 게 목적이다.
  thumbnailUrl: z.string().optional(),
});

const editProgressStoreSchema = z.object({
  schemaVersion: z.literal(EDIT_PROGRESS_SCHEMA_VERSION),
  entries: z.array(editProgressSchema),
});

export type EditProgress = z.infer<typeof editProgressSchema>;

/**
 * 저장된 목록을 읽는다. 손상됐거나 없으면 똑같이 빈 배열로 다룬다 — 편집 단계는 드래프트와
 * 달리 "이어갈 수 없어 안내"할 내용이 없어, 못 읽으면 조용히 접는다.
 */
function readEntries(): EditProgress[] {
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    // 프라이빗 모드 등 저장소 접근 불가 — 표시가 없는 것과 같게 다룬다.
    return [];
  }

  if (!raw) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  const result = editProgressStoreSchema.safeParse(parsed);
  if (!result.success) return [];

  return result.data.entries;
}

function writeEntries(entries: EditProgress[]) {
  try {
    if (entries.length === 0) {
      window.localStorage.removeItem(STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        schemaVersion: EDIT_PROGRESS_SCHEMA_VERSION,
        entries,
      } satisfies z.infer<typeof editProgressStoreSchema>),
    );
  } catch {
    // 저장소 접근 불가·용량 초과 — 이어하기 표시만 못 남길 뿐 편집은 정상 진행된다.
  }
}

/** 편집 중인 세션들을 최신순(가장 최근에 손댄 것 먼저)으로 돌려준다. */
export function loadEditProgressList(): EditProgress[] {
  // updatedAt 은 ISO 문자열이라 사전순 = 시간순이다.
  return readEntries().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function saveEditProgress(sessionId: string, thumbnailUrl?: string) {
  // 미리보기는 http(s) URL 일 때만 담는다 — data: URL 은 바이트가 통째로 들어와 저장소 용량을
  // 넘길 수 있다(#165 413 과 같은 결). 없으면 카드는 플레이스홀더로 뜨면 그만이다.
  const previewUrl =
    thumbnailUrl && /^https?:\/\//.test(thumbnailUrl)
      ? thumbnailUrl
      : undefined;

  // 같은 세션의 이전 표시는 걷어내고 지금 시각으로 다시 얹는다(최신순 정렬의 기준을 새로 잡는다).
  const others = readEntries().filter((entry) => entry.sessionId !== sessionId);
  writeEntries([
    ...others,
    {
      sessionId,
      updatedAt: new Date().toISOString(),
      ...(previewUrl ? { thumbnailUrl: previewUrl } : {}),
    },
  ]);
}

/**
 * 저장(결과 전환)으로 편집이 끝났을 때 호출한다 — 이 세션의 표시만 정확히 거둔다.
 * (저장된 보드 재편집처럼 sessionId 가 없는 편집은 애초에 이 표시를 남기지도 지우지도 않는다.)
 */
export function clearEditProgress(sessionId: string) {
  writeEntries(readEntries().filter((entry) => entry.sessionId !== sessionId));
}
