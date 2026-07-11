// 무드보드 삭제 서비스 함수. 소유자 컬럼을 WHERE 절에 실어 보내 삭제 대상을 좁힌다 —
// save-moodboard.ts와 같은 이유로, 확인과 삭제 사이에 틈을 두지 않는다 (#126).

import "server-only";

import type { Requester } from "@/lib/auth/requester";
import { createServiceClient } from "@/lib/supabase/service";

export type DeleteMoodboardOutcome =
  | { ok: true }
  | { ok: false; code: "NOT_FOUND" | "INTERNAL_ERROR"; error: string };

export async function deleteOwnedMoodboard(
  moodboardId: string,
  requester: Exclude<Requester, { kind: "anonymous" }>,
): Promise<DeleteMoodboardOutcome> {
  const service = createServiceClient();
  const ownerColumn =
    requester.kind === "user" ? "user_id" : "guest_session_id";
  const ownerValue =
    requester.kind === "user" ? requester.userId : requester.guestSessionId;

  const { data: deleted, error } = await service
    .from("moodboards")
    .delete()
    .eq("id", moodboardId)
    .eq(ownerColumn, ownerValue)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[moodboards] delete 실패", error);
    return {
      ok: false,
      code: "INTERNAL_ERROR",
      error: "무드보드를 삭제하지 못했어요.",
    };
  }
  if (!deleted) {
    return {
      ok: false,
      code: "NOT_FOUND",
      error: "무드보드를 찾지 못했어요.",
    };
  }

  return { ok: true };
}
