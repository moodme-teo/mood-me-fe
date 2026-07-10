// 크롭 결과 PNG(dataURL)를 우리 서버로 보내지 않고 Supabase Storage에 직접 업로드한다
// (#163) — dataURL을 그대로 PATCH 요청 body에 실으면 Vercel 요청 바디 제한(413)에
// 걸린다. Storage가 구성되지 않은 로컬/E2E 환경(NEXT_PUBLIC_SUPABASE_URL 없음)에서는
// 업로드를 건너뛰고 undefined를 돌려준다 — 결과 페이지는 exportedImageUrl 없이도
// elements를 Konva로 합성해 보여준다(#102 이전 보드와 같은 폴백).

import { createExportUploadUrl } from "@/lib/api/create-export-upload-url";
import { createClient } from "@/lib/supabase/client";
import { MOODBOARD_EXPORT_BUCKET } from "@/types/moodboard";

async function uploadDataUrlToStorage(
  moodboardId: string,
  pngDataUrl: string,
  kind: "export" | "base",
): Promise<string | undefined> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return undefined;
  }

  const { path, token } = await createExportUploadUrl(moodboardId, kind);

  const blob = await (await fetch(pngDataUrl)).blob();
  const supabase = createClient();
  const { error } = await supabase.storage
    .from(MOODBOARD_EXPORT_BUCKET)
    .uploadToSignedUrl(path, token, blob, { contentType: "image/png" });

  if (error) {
    throw error;
  }

  return supabase.storage.from(MOODBOARD_EXPORT_BUCKET).getPublicUrl(path).data
    .publicUrl;
}

export function uploadExportedImage(moodboardId: string, pngDataUrl: string) {
  return uploadDataUrlToStorage(moodboardId, pngDataUrl, "export");
}

// baseImageUrl(gpt-image-2 원본 보드 이미지)은 생성 시점(uploadGeneratedBaseImage,
// generate-mood-analysis.ts)에 Storage URL로 저장되는 게 정상 경로다 — 이 함수는 그
// 전에 만들어진 레거시 보드(base64가 그대로 baseImageUrl에 남아있는 경우)를 재편집·
// 재저장할 때 자가 치유하는 용도다. dataURL이 아니면(이미 URL이면) 호출하지 않는다.
export function uploadBaseImage(moodboardId: string, pngDataUrl: string) {
  return uploadDataUrlToStorage(moodboardId, pngDataUrl, "base");
}
