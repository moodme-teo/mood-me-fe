// 크롭 결과 PNG(export)·gpt-image-2 원본 보드 이미지(base) 둘 다 Supabase Storage에
// 직접 올릴 수 있도록 signed upload URL을 발급한다 (#163). base64 dataURL을 우리 서버
// body로 보내지 않는 게 핵심 — 그러면 Vercel 요청 바디 제한(413)을 그대로 다시 타게 된다.
// base 쪽은 재편집 시 레거시 보드(아직 base64인 baseImageUrl)를 자가 치유하는 경로가 쓴다.

import "server-only";

import { createServiceClient } from "@/lib/supabase/service";
import { MOODBOARD_EXPORT_BUCKET } from "@/types/moodboard";

export type UploadKind = "export" | "base";

export type CreateExportUploadTargetResult =
  | { ok: true; value: { path: string; token: string } }
  | { ok: false; code: "INTERNAL_ERROR"; error: string };

function canUseSupabaseService() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SECRET_KEY,
  );
}

function pathFor(moodboardId: string, kind: UploadKind) {
  return kind === "base" ? `${moodboardId}-base.png` : `${moodboardId}.png`;
}

// moodboardId(+kind) 하나당 파일 하나로 덮어쓴다 — 공유 URL이 재저장마다 바뀌면 안 되므로
// upsert로 기존 파일을 그대로 교체한다.
export async function createExportUploadTarget(
  moodboardId: string,
  kind: UploadKind = "export",
): Promise<CreateExportUploadTargetResult> {
  if (!canUseSupabaseService()) {
    return {
      ok: false,
      code: "INTERNAL_ERROR",
      error: "이미지 업로드를 준비하지 못했어요.",
    };
  }

  const service = createServiceClient();
  const path = pathFor(moodboardId, kind);
  const { data, error } = await service.storage
    .from(MOODBOARD_EXPORT_BUCKET)
    .createSignedUploadUrl(path, { upsert: true });

  if (error || !data) {
    console.error("[moodboards] export upload url 발급 실패", error);
    return {
      ok: false,
      code: "INTERNAL_ERROR",
      error: "이미지 업로드를 준비하지 못했어요.",
    };
  }

  return { ok: true, value: { path: data.path, token: data.token } };
}
