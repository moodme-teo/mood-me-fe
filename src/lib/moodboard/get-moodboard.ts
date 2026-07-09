import "server-only";

import { getMockMoodboard } from "@/lib/moodboard/mock";
import { createServiceClient } from "@/lib/supabase/service";
import type {
  Moodboard,
  MoodboardElement,
  MoodProfile,
} from "@/types/moodboard";

// 리포트(GPT-5)는 이미지 생성과 독립적으로 돈다 — "완성하고 공유하기" 시점에 아직
// 안 끝났으면 mood_profile이 null로 저장된다. 결과 페이지·공유 미리보기가 깨지지
// 않도록 폴백을 둔다.
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
  exported_image_data_url: string | null;
  guest_session_id: string | null;
  updated_at: string | null;
};

export type GetMoodboardByIdResult =
  | { ok: true; value: Moodboard }
  | { ok: false; code: "NOT_FOUND" | "INTERNAL_ERROR"; error: string };

function canUseSupabaseService() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SECRET_KEY,
  );
}

// API 라우트(GET /api/moodboards/[moodboardId])와 결과 페이지의 OG 메타데이터
// (generateMetadata) 둘 다 이 함수로 실제 데이터를 조회한다 — mock/실제 데이터
// 분기·mood_profile 폴백 로직을 한 곳에서만 관리한다.
export async function getMoodboardById(
  moodboardId: string,
): Promise<GetMoodboardByIdResult> {
  if (moodboardId === "404" || moodboardId.startsWith("missing")) {
    return { ok: false, code: "NOT_FOUND", error: "무드보드를 찾지 못했어요." };
  }

  if (!canUseSupabaseService()) {
    return { ok: true, value: getMockMoodboard(moodboardId) };
  }

  const service = createServiceClient();
  const { data, error } = await service
    .from("moodboards")
    .select(
      "id, base_image_url, elements, mood_profile, exported_image_data_url, guest_session_id, updated_at",
    )
    .eq("id", moodboardId)
    .maybeSingle();

  if (error) {
    return {
      ok: false,
      code: "INTERNAL_ERROR",
      error: "무드보드를 불러오지 못했어요.",
    };
  }
  if (!data) {
    return { ok: false, code: "NOT_FOUND", error: "무드보드를 찾지 못했어요." };
  }

  const row = data as MoodboardRow;

  return {
    ok: true,
    value: {
      id: row.id,
      baseImageUrl: row.base_image_url ?? "",
      elements: (row.elements as MoodboardElement[] | null) ?? [],
      moodProfile:
        (row.mood_profile as MoodProfile | null) ?? PENDING_MOOD_PROFILE,
      // 크롭 에디터(#99)가 저장한 평면 결과 이미지 — 결과 페이지가 이걸 그대로 노출한다.
      exportedImageUrl: row.exported_image_data_url ?? null,
      isGuest: row.guest_session_id !== null,
      updatedAt: row.updated_at ?? new Date().toISOString(),
    },
  };
}
