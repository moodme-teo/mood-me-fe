// gpt-image-2가 돌려주는 보드 이미지(data URL)를 job에 그대로 저장하면, 편집 완료 시
// 클라이언트가 그 값을 baseImageUrl로 그대로 PATCH body에 실어 보내 Vercel 요청 바디
// 제한(413)에 걸린다 — exportedImageUrl과 같은 문제였다(#163 후속). 생성 직후 여기서
// Storage에 올려 base64가 애초에 프로세스 밖으로 나가지 않게 한다. 서버가 이미 service
// role을 쥐고 있어 크롭 에디터(uploadExportedImage)처럼 signed URL을 거칠 필요 없이
// 직접 업로드한다.

import "server-only";

import { createServiceClient } from "@/lib/supabase/service";
import { MOODBOARD_EXPORT_BUCKET } from "@/types/moodboard";

function canUseSupabaseService() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SECRET_KEY,
  );
}

export async function uploadGeneratedBaseImage(
  jobId: string,
  pngDataUrl: string,
): Promise<string> {
  if (!canUseSupabaseService()) {
    // Storage 미구성 로컬/E2E 환경 — 기존 동작(base64 그대로) 유지.
    return pngDataUrl;
  }

  const base64 = pngDataUrl.slice(pngDataUrl.indexOf(",") + 1);
  const buffer = Buffer.from(base64, "base64");
  const path = `job-${jobId}.png`;

  const service = createServiceClient();
  const { error } = await service.storage
    .from(MOODBOARD_EXPORT_BUCKET)
    .upload(path, buffer, { contentType: "image/png", upsert: true });

  if (error) {
    throw error;
  }

  return service.storage.from(MOODBOARD_EXPORT_BUCKET).getPublicUrl(path).data
    .publicUrl;
}
