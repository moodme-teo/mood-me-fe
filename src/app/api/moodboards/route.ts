import { z } from "zod";

import { apiError, apiSuccess } from "@/lib/api-response";
import { getMoodboardSummaries } from "@/lib/moodboard/list";

const moodboardListQuerySchema = z.object({
  guestSessionId: z.uuid().optional(),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsedQuery = moodboardListQuerySchema.safeParse({
    guestSessionId: searchParams.get("guestSessionId") ?? undefined,
  });

  if (!parsedQuery.success) {
    return apiError("INVALID_INPUT", "게스트 세션 형식이 올바르지 않아요.", 400);
  }

  const result = await getMoodboardSummaries(parsedQuery.data);

  if (!result.ok) {
    return apiError("INTERNAL_ERROR", result.error, 500);
  }

  return apiSuccess({ items: result.value });
}
