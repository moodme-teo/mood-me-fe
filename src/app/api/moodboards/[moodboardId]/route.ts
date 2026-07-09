import { moodboardSchema } from "@/lib/api/get-moodboard";
import { updateMoodboardRequestSchema } from "@/lib/api/update-moodboard";
import { apiError, apiSuccess } from "@/lib/api-response";
import { getMockMoodboard } from "@/lib/moodboard/mock";
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

// 편집(PATCH)이 저장한 크롭 결과. 저장 row에는 mood_profile이 없으므로 base·elements·
// 크롭 결과 이미지만 뽑아 mock 프로필 위에 덮어씌운다. row가 없으면 null.
async function loadSavedMoodboard(moodboardId: string) {
  if (!canUseSupabaseService() || !isUuid(moodboardId)) return null;

  const service = createServiceClient();
  const { data, error } = await service
    .from("moodboards")
    .select("base_image_url, elements, exported_image_data_url")
    .eq("id", moodboardId)
    .maybeSingle();

  if (error) {
    console.error("[moodboards.GET] 조회 실패", error);
    return null;
  }
  if (!data) return null;

  return {
    ...(data.base_image_url ? { baseImageUrl: data.base_image_url } : {}),
    ...(Array.isArray(data.elements) ? { elements: data.elements } : {}),
    exportedImageUrl: data.exported_image_data_url ?? null,
  };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ moodboardId: string }> },
) {
  const { moodboardId } = await params;

  if (moodboardId === "404" || moodboardId.startsWith("missing")) {
    return apiError("NOT_FOUND", "무드보드를 찾지 못했어요.", 404);
  }

  const fallbackMoodboard = getMockMoodboard(moodboardId);
  // 저장된 편집본이 있으면 크롭 결과 이미지·base·elements를 mock 위에 덮어씌운다.
  const saved = await loadSavedMoodboard(moodboardId);
  const parsed = moodboardSchema.safeParse(
    saved ? { ...fallbackMoodboard, ...saved } : fallbackMoodboard,
  );

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
