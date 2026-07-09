import { moodboardSchema } from "@/lib/api/get-moodboard";
import { updateMoodboardRequestSchema } from "@/lib/api/update-moodboard";
import { apiError, apiSuccess } from "@/lib/api-response";
import { getMockMoodboard } from "@/lib/moodboard/mock";
import { createServiceClient } from "@/lib/supabase/service";
import type { MoodProfile } from "@/types/moodboard";

function canUseSupabaseService() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SECRET_KEY,
  );
}

// 리포트(GPT-5)는 이미지 생성과 독립적으로 돈다 — "완성하고 공유하기" 시점에 아직
// 안 끝났으면 mood_profile이 null로 저장된다. 결과 페이지가 깨지지 않도록 폴백을 둔다.
const PENDING_MOOD_PROFILE: MoodProfile = {
  title: "리포트를 준비하고 있어요",
  type_name: "분석 중",
  reading: {
    conviction: "무드 분석이 아직 끝나지 않았어요. 잠시 후 새로고침해 보세요.",
    desire: "무드 분석이 아직 끝나지 않았어요. 잠시 후 새로고침해 보세요.",
    showdown: "무드 분석이 아직 끝나지 않았어요. 잠시 후 새로고침해 보세요.",
  },
  mood_vector: {
    calm_energy: 0.5,
    warm_cool: 0.5,
    minimal_maximal: 0.5,
    vintage_modern: 0.5,
    real_dreamy: 0.5,
  },
  keywords: [],
  sticker_phrases: [],
};

type MoodboardRow = {
  id: string;
  base_image_url: string | null;
  elements: unknown;
  mood_profile: unknown;
  guest_session_id: string | null;
  updated_at: string | null;
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ moodboardId: string }> },
) {
  const { moodboardId } = await params;

  if (moodboardId === "404" || moodboardId.startsWith("missing")) {
    return apiError("NOT_FOUND", "무드보드를 찾지 못했어요.", 404);
  }

  if (!canUseSupabaseService()) {
    const fallbackMoodboard = getMockMoodboard(moodboardId);
    const parsed = moodboardSchema.safeParse(fallbackMoodboard);

    if (!parsed.success) {
      return apiError(
        "INTERNAL_ERROR",
        "무드보드 데이터를 불러오지 못했어요.",
        500,
      );
    }

    return apiSuccess(parsed.data);
  }

  const service = createServiceClient();
  const { data, error } = await service
    .from("moodboards")
    .select(
      "id, base_image_url, elements, mood_profile, guest_session_id, updated_at",
    )
    .eq("id", moodboardId)
    .maybeSingle();

  if (error) {
    return apiError("INTERNAL_ERROR", "무드보드를 불러오지 못했어요.", 500);
  }
  if (!data) {
    return apiError("NOT_FOUND", "무드보드를 찾지 못했어요.", 404);
  }

  const row = data as MoodboardRow;
  const parsed = moodboardSchema.safeParse({
    id: row.id,
    baseImageUrl: row.base_image_url ?? "",
    elements: row.elements ?? [],
    moodProfile:
      (row.mood_profile as MoodProfile | null) ?? PENDING_MOOD_PROFILE,
    isGuest: row.guest_session_id !== null,
    updatedAt: row.updated_at ?? new Date().toISOString(),
  });

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

  if (!canUseSupabaseService()) {
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
      mood_profile: parsed.data.moodProfile ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (error) {
    return apiError("INTERNAL_ERROR", "무드보드를 저장하지 못했어요.", 500);
  }

  return apiSuccess({
    id: moodboardId,
    baseImageUrl: parsed.data.baseImageUrl,
    elements: parsed.data.elements,
    persisted: true,
  });
}
