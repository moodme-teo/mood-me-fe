// 무드보드 저장(생성/갱신) 서비스 함수. moodboardId는 공유 링크에 그대로 들어 있는 값이라
// "id를 아는 사람"과 "보드의 주인"은 다르다 — 서버가 매번 소유자를 확인한다 (#126).

import "server-only";

import type { Requester } from "@/lib/auth/requester";
import { ownerColumnsOf } from "@/lib/auth/requester";
import { createServiceClient } from "@/lib/supabase/service";
import type { MoodboardElement, MoodProfile } from "@/types/moodboard";

// Postgres unique_violation — 같은 moodboardId의 row가 이미 있다는 뜻.
const UNIQUE_VIOLATION = "23505";

export type SaveMoodboardInput = {
  baseImageUrl: string;
  elements: MoodboardElement[];
  exportedImageDataUrl?: string;
  moodProfile?: MoodProfile;
};

export type SaveMoodboardOutcome =
  | { ok: true }
  | { ok: false; code: "NOT_FOUND" | "INTERNAL_ERROR"; error: string };

export async function saveOwnedMoodboard(
  moodboardId: string,
  requester: Exclude<Requester, { kind: "anonymous" }>,
  input: SaveMoodboardInput,
): Promise<SaveMoodboardOutcome> {
  const service = createServiceClient();

  // moodProfile은 보낸 경우에만 갱신 — 재편집 저장이 기존 리포트를 지우지 않도록 omit.
  const content = {
    base_image_url: input.baseImageUrl,
    elements: input.elements,
    exported_image_data_url: input.exportedImageDataUrl ?? null,
    ...(input.moodProfile ? { mood_profile: input.moodProfile } : {}),
    updated_at: new Date().toISOString(),
  };

  // 신규 생성을 먼저 시도한다 — 소유자는 이때만 심는다. "조회 후 upsert"는 두 요청이 동시에
  // "row 없음"을 보고 둘 다 쓰는 경합에 뚫리므로 PK 충돌 판정을 DB에 맡긴다.
  const { error: insertError } = await service
    .from("moodboards")
    .insert({ id: moodboardId, ...ownerColumnsOf(requester), ...content });

  if (!insertError) {
    return { ok: true };
  }
  if (insertError.code !== UNIQUE_VIOLATION) {
    console.error("[moodboards] insert 실패", insertError);
    return {
      ok: false,
      code: "INTERNAL_ERROR",
      error: "무드보드를 저장하지 못했어요.",
    };
  }

  // 이미 있는 보드 — 소유자가 일치할 때만 갱신한다. 소유자 조건을 WHERE 절에 실어 보내므로
  // 확인과 쓰기 사이에 틈이 없고, 소유자 컬럼은 갱신 대상에서 빠져 불변이다.
  // (#134가 upsert로 소유자까지 덮어써 보드를 통째로 넘길 수 있었다.)
  const ownerColumn =
    requester.kind === "user" ? "user_id" : "guest_session_id";
  const ownerValue =
    requester.kind === "user" ? requester.userId : requester.guestSessionId;

  const { data: updated, error: updateError } = await service
    .from("moodboards")
    .update(content)
    .eq("id", moodboardId)
    .eq(ownerColumn, ownerValue)
    .select("id")
    .maybeSingle();

  if (updateError) {
    console.error("[moodboards] update 실패", updateError);
    return {
      ok: false,
      code: "INTERNAL_ERROR",
      error: "무드보드를 저장하지 못했어요.",
    };
  }

  // 갱신된 row가 없다 = 남의 보드이거나 소유자가 비어 있는 레거시 row다. 403은 존재 여부를
  // 흘리므로 없을 때와 같은 404로 뭉갠다 (#126).
  if (!updated) {
    return {
      ok: false,
      code: "NOT_FOUND",
      error: "무드보드를 찾지 못했어요.",
    };
  }

  return { ok: true };
}
