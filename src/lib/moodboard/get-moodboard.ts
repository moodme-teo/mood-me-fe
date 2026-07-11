import "server-only";

import { getMockMoodboard } from "@/lib/moodboard/mock";
import { createServiceClient } from "@/lib/supabase/service";
import type {
  AnalysisStatus,
  EditState,
  Moodboard,
  MoodboardElement,
  MoodProfile,
} from "@/types/moodboard";

// 리포트(GPT-5)는 이미지 생성과 독립적으로 돈다 — "완성하고 공유하기" 시점에 아직
// 안 끝났으면 mood_profile이 null로 저장된다. 결과 페이지·공유 미리보기가 깨지지
// 않도록 폴백을 둔다. "잠시 후 새로고침해 보세요" 안내는 fetchLatestJobFallback이
// 실제로 최신 job을 다시 조회하기 때문에 참이다(#125) — 이 폴백이 없던 시절에는
// moodboards.mood_profile이 저장 이후 절대 갱신되지 않아 거짓 안내였다.
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
  analysis_status: AnalysisStatus | null;
  test_session_id: string | null;
  exported_image_url: string | null;
  edit_state: unknown;
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

type JobFallback = {
  moodProfile: MoodProfile | null;
  analysisStatus: AnalysisStatus;
};

// moodboards.mood_profile은 "완성하고 공유하기" 시점의 스냅샷이다 — 그 시점에 리포트가
// 아직 안 끝났으면 null로 저장되고, 그 뒤 job이 완성돼도 moodboards는 절대 갱신되지
// 않는다(#125). test_session_id로 원본 job을 다시 조회해 그 자리를 메운다 — 새로고침이
// 실제로 의미 있어지는 지점이다.
async function fetchLatestJobFallback(
  service: ReturnType<typeof createServiceClient>,
  testSessionId: string,
): Promise<JobFallback | null> {
  const { data, error } = await service
    .from("moodboard_generation_jobs")
    .select("mood_profile, analysis_status")
    .eq("test_session_id", testSessionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as {
    mood_profile: unknown;
    analysis_status: AnalysisStatus;
  };
  return {
    moodProfile: (row.mood_profile as MoodProfile | null) ?? null,
    analysisStatus: row.analysis_status,
  };
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
      "id, base_image_url, elements, mood_profile, analysis_status, test_session_id, exported_image_url, edit_state, guest_session_id, updated_at",
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

  let moodProfile = row.mood_profile as MoodProfile | null;
  let analysisStatus = row.analysis_status;

  // "failed"는 이미 확정된 결과다(직접 재시도로만 바뀐다, #122) — 다시 조회할 필요가
  // 없다. 그 외(analysis_status가 없거나 아직 진행 중)인데 결과가 비어 있으면, 저장
  // 이후 리포트가 끝났을 수 있으니 최신 job을 한 번 더 본다.
  if (!moodProfile && row.test_session_id && analysisStatus !== "failed") {
    const fallback = await fetchLatestJobFallback(service, row.test_session_id);
    if (fallback) {
      moodProfile = fallback.moodProfile;
      analysisStatus = fallback.analysisStatus;
    }
  }

  return {
    ok: true,
    value: {
      id: row.id,
      baseImageUrl: row.base_image_url ?? "",
      elements: (row.elements as MoodboardElement[] | null) ?? [],
      moodProfile: moodProfile ?? PENDING_MOOD_PROFILE,
      analysisStatus,
      // 크롭 에디터(#99)가 저장한 평면 결과 이미지 — 결과 페이지가 이걸 그대로 노출한다.
      exportedImageUrl: row.exported_image_url ?? null,
      // 재편집 구도 복원 (#116). 레거시 보드는 null — 편집 화면이 기본값으로 진입한다.
      editState: (row.edit_state as EditState | null) ?? null,
      isGuest: row.guest_session_id !== null,
      updatedAt: row.updated_at ?? new Date().toISOString(),
    },
  };
}
