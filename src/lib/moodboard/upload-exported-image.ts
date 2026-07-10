// 크롭 결과 PNG(dataURL)를 우리 서버로 보내지 않고 Supabase Storage에 직접 업로드한다
// (#163) — dataURL을 그대로 PATCH 요청 body에 실으면 Vercel 요청 바디 제한(413)에
// 걸린다. Storage가 구성되지 않은 로컬/E2E 환경(NEXT_PUBLIC_SUPABASE_URL 없음)에서는
// 업로드를 건너뛰고 undefined를 돌려준다 — 결과 페이지는 exportedImageUrl 없이도
// elements를 Konva로 합성해 보여준다(#102 이전 보드와 같은 폴백).

import { createExportUploadUrl } from "@/lib/api/create-export-upload-url";
import { createClient } from "@/lib/supabase/client";
import { MOODBOARD_EXPORT_BUCKET } from "@/types/moodboard";

export async function uploadExportedImage(
  moodboardId: string,
  pngDataUrl: string,
): Promise<string | undefined> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return undefined;
  }

  const { path, token } = await createExportUploadUrl(moodboardId);

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
