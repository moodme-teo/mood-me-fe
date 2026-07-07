import { moodboardSchema } from "@/lib/api/get-moodboard";
import { apiError, apiSuccess } from "@/lib/api-response";
import { getMockMoodboard } from "@/lib/moodboard/mock";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ moodboardId: string }> },
) {
  const { moodboardId } = await params;

  if (moodboardId === "404" || moodboardId.startsWith("missing")) {
    return apiError("NOT_FOUND", "무드보드를 찾지 못했어요.", 404);
  }

  const fallbackMoodboard = getMockMoodboard(moodboardId);
  const parsed = moodboardSchema.safeParse(fallbackMoodboard);

  if (!parsed.success) {
    return apiError("INTERNAL_ERROR", "무드보드 데이터를 불러오지 못했어요.", 500);
  }

  return apiSuccess(parsed.data);
}
