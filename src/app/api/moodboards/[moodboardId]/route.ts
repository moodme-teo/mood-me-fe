import { moodboardSchema } from "@/lib/api/get-moodboard";
import { updateMoodboardRequestSchema } from "@/lib/api/update-moodboard";
import { apiError, apiSuccess } from "@/lib/api-response";
import { getMoodboardById } from "@/lib/moodboard/get-moodboard";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

function canUseSupabaseService() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SECRET_KEY,
  );
}

// moodboards.id는 uuid PK — 비-UUID id(테스트/목 흐름의 임의 라우트 등)를 그대로 upsert하면
// Postgres가 "invalid input syntax for type uuid"로 터진다. 저장을 막지 않고 미영속으로 흘려보낸다.
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(value: string) {
  return UUID_PATTERN.test(value);
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ moodboardId: string }> },
) {
  const { moodboardId } = await params;

  const result = await getMoodboardById(moodboardId);
  if (!result.ok) {
    const status = result.code === "NOT_FOUND" ? 404 : 500;
    return apiError(result.code, result.error, status);
  }

  const parsed = moodboardSchema.safeParse(result.value);
  if (!parsed.success) {
    return apiError(
      "INTERNAL_ERROR",
      "무드보드 데이터를 불러오지 못했어요.",
      500,
    );
  }

  return apiSuccess(parsed.data);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ moodboardId: string }> },
) {
  const { moodboardId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("INVALID_INPUT", "유효한 JSON body가 필요합니다", 400);
  }

  const parsed = updateMoodboardRequestSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues
      .map((issue) => issue.message)
      .join("; ");
    return apiError("INVALID_INPUT", message, 400);
  }

  if (!canUseSupabaseService() || !isUuid(moodboardId)) {
    return apiSuccess({
      id: moodboardId,
      baseImageUrl: parsed.data.baseImageUrl,
      elements: parsed.data.elements,
      persisted: false,
    });
  }

  // 로그인 여부는 서버가 인증 세션(쿠키)으로 직접 확인한다 — user_id를 클라이언트가
  // 요청 본문에 자칭하도록 두지 않는다(save-session.ts와 동일한 패턴).
  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  const service = createServiceClient();
  const { error } = await service.from("moodboards").upsert(
    {
      id: moodboardId,
      user_id: user?.id ?? null,
      guest_session_id: user ? null : (parsed.data.guestSessionId ?? null),
      base_image_url: parsed.data.baseImageUrl,
      elements: parsed.data.elements,
      exported_image_data_url: parsed.data.exportedImageDataUrl ?? null,
      // editState는 보낸 경우에만 갱신 — moodProfile과 같은 omit 패턴(#116).
      ...(parsed.data.editState ? { edit_state: parsed.data.editState } : {}),
      // moodProfile은 보낸 경우에만 갱신 — 재편집 저장이 기존 리포트를 지우지 않도록 omit.
      ...(parsed.data.moodProfile
        ? { mood_profile: parsed.data.moodProfile }
        : {}),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (error) {
    console.error("[moodboards.PATCH] upsert 실패", error);
    return apiError("INTERNAL_ERROR", "무드보드를 저장하지 못했어요.", 500);
  }

  return apiSuccess({
    id: moodboardId,
    baseImageUrl: parsed.data.baseImageUrl,
    elements: parsed.data.elements,
    persisted: true,
  });
}
