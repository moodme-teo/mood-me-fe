import { updateMoodboardRequestSchema } from "@/lib/api/update-moodboard";
import { apiError, apiSuccess } from "@/lib/api-response";
import { createServiceClient } from "@/lib/supabase/service";

function canUseSupabaseService() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SECRET_KEY,
  );
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
