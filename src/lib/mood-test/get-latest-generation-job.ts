import "server-only";

import { createServiceClient } from "@/lib/supabase/service";
import type { MoodboardElement } from "@/types/moodboard";

// Supabase 생성 타입이 아직 없어 API 경계에서 row 타입을 손으로 좁힌다
// (src/lib/moodboard/list.ts와 동일한 패턴).
type GenerationJobRow = {
  id: string;
  status: "queued" | "processing" | "completed" | "failed";
  progress_percent: number;
  status_message: string | null;
  elements: unknown;
  base_image_url: string | null;
};

export type LatestGenerationJob = {
  id: string;
  status: "queued" | "processing" | "completed" | "failed";
  progressPercent: number;
  statusMessage: string | null;
  elements: MoodboardElement[];
  baseImageUrl: string | null;
};

export type GetLatestGenerationJobResult =
  { ok: true; value: LatestGenerationJob } | { ok: false; error: string };

// 재시도는 같은 test_session_id로 새 job row를 만드는 방식이라(#37), 조회 시 해당 세션의
// 최신 job(created_at desc limit 1)을 기준으로 삼는다.
export async function getLatestGenerationJob(
  testSessionId: string,
): Promise<GetLatestGenerationJobResult> {
  const service = createServiceClient();
  const { data, error } = await service
    .from("moodboard_generation_jobs")
    .select(
      "id, status, progress_percent, status_message, elements, base_image_url",
    )
    .eq("test_session_id", testSessionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message };
  }
  if (!data) {
    return { ok: false, error: "생성 job을 찾을 수 없습니다" };
  }

  const row = data as GenerationJobRow;

  return {
    ok: true,
    value: {
      id: row.id,
      status: row.status,
      progressPercent: row.progress_percent,
      statusMessage: row.status_message,
      elements: (row.elements as MoodboardElement[] | null) ?? [],
      baseImageUrl: row.base_image_url,
    },
  };
}
