import { apiError, apiSuccess } from "@/lib/api-response";
import { getRequester } from "@/lib/auth/requester";
import {
  createExportUploadTarget,
  type UploadKind,
} from "@/lib/moodboard/create-export-upload-target";
import { checkMoodboardOwner } from "@/lib/moodboard/moodboard-owner";

function parseKind(value: unknown): UploadKind {
  return value === "base" ? "base" : "export";
}

// 크롭 편집 완료 시 export한 PNG(kind: "export") 또는 gpt-image-2 원본 보드 이미지
// (kind: "base", 레거시 보드 재편집 자가 치유용)를 Supabase Storage에 직접 업로드하기
// 위한 signed upload URL을 발급한다. base64 dataURL을 이 서버로 보내지 않는 게 핵심이다
// — 그러면 Vercel 요청 바디 제한에 걸려 배포 환경에서만 나는 413("content too large")을
// 그대로 재현한다(#163).
export async function POST(
  request: Request,
  { params }: { params: Promise<{ moodboardId: string }> },
) {
  const { moodboardId } = await params;
  const body = await request.json().catch(() => null);
  const kind = parseKind((body as { kind?: unknown } | null)?.kind);

  const requester = await getRequester();
  if (requester.kind === "anonymous") {
    return apiError(
      "UNAUTHORIZED",
      "세션이 만료됐어요. 처음부터 다시 시작해 주세요.",
      401,
    );
  }

  const ownerCheck = await checkMoodboardOwner(moodboardId, requester);
  if (!ownerCheck.ok) {
    return apiError("INTERNAL_ERROR", ownerCheck.error, 500);
  }
  // 신규 보드는 아직 소유자가 없다 — 최초 저장(insert)의 소유권 판정은 PATCH의 PK 충돌
  // 검사(save-moodboard.ts)에 맡기고, 여기서는 "이미 남의 보드로 확정된 경우"만 막는다.
  if (ownerCheck.exists && !ownerCheck.isOwner) {
    return apiError("FORBIDDEN", "본인 무드보드만 저장할 수 있어요.", 403);
  }

  const target = await createExportUploadTarget(moodboardId, kind);
  if (!target.ok) {
    return apiError(target.code, target.error, 500);
  }

  return apiSuccess(target.value);
}
