import { moodboardSchema } from "@/lib/api/get-moodboard";
import { updateMoodboardRequestSchema } from "@/lib/api/update-moodboard";
import { apiError, apiSuccess } from "@/lib/api-response";
import { getMoodboardById } from "@/lib/moodboard/get-moodboard";
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

  const service = createServiceClient();
  const { error } = await service.from("moodboards").upsert(
    {
      id: moodboardId,
      base_image_url: parsed.data.baseImageUrl,
      elements: parsed.data.elements,
      exported_image_data_url: parsed.data.exportedImageDataUrl ?? null,
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
