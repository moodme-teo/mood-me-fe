import "server-only";

import type { MoodboardSummary } from "@/lib/moodboard/summary";
import { moodboardSummariesSchema } from "@/lib/moodboard/summary";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

type MoodboardListResult =
  { ok: true; value: MoodboardSummary[] } | { ok: false; error: string };

type MoodboardRow = {
  id: string;
  base_image_url: string | null;
  exported_image_data_url: string | null;
  guest_session_id: string | null;
  mood_profile: unknown;
  updated_at: string | null;
};

type GetMoodboardSummariesInput = {
  guestSessionId?: string | null;
};

function canUseSupabaseAuth() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

function canUseSupabaseService() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SECRET_KEY,
  );
}

function getProfileString(profile: unknown, key: "title" | "type_name") {
  if (!profile || typeof profile !== "object") {
    return null;
  }

  const value = Object.entries(profile).find(
    ([entryKey]) => entryKey === key,
  )?.[1];
  return typeof value === "string" && value.length > 0 ? value : null;
}

export async function getMoodboardSummaries(
  input: GetMoodboardSummariesInput = {},
): Promise<MoodboardListResult> {
  if (!canUseSupabaseAuth()) {
    return { ok: true, value: [] };
  }

  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user && !input.guestSessionId) {
    return { ok: true, value: [] };
  }

  const dataClient = canUseSupabaseService()
    ? createServiceClient()
    : authClient;
  const query = dataClient
    .from("moodboards")
    .select(
      "id, base_image_url, exported_image_data_url, guest_session_id, mood_profile, updated_at",
    )
    .order("updated_at", { ascending: false });

  const { data, error } = await (user
    ? query.eq("user_id", user.id)
    : query.eq("guest_session_id", input.guestSessionId));

  if (error) {
    return { ok: false, error: "저장한 무드보드를 불러오지 못했어요." };
  }

  // Supabase generated DB types are not present in this repository yet, so the
  // row shape is narrowed at the API boundary before Zod validation.
  const rows = (data ?? []) as MoodboardRow[];
  const parsed = moodboardSummariesSchema.safeParse(
    rows.map((row) => {
      const title = getProfileString(row.mood_profile, "title");
      const typeName = getProfileString(row.mood_profile, "type_name");

      return {
        id: row.id,
        // 크롭 에디터(#99)로 저장한 평면 결과가 있으면 그걸 우선 노출한다 —
        // 없으면(크롭 전) 조립된 원본 base 이미지로 폴백한다.
        thumbnailUrl:
          row.exported_image_data_url ??
          row.base_image_url ??
          "/test-image/aesthetic/c18.jpg",
        typeName: typeName ?? title ?? "이름 없는 무드",
        title: title ?? typeName ?? "저장한 무드보드",
        updatedAt: row.updated_at ?? new Date().toISOString(),
        isGuest: row.guest_session_id !== null,
      };
    }),
  );

  if (!parsed.success) {
    return { ok: false, error: "무드보드 목록 형식이 올바르지 않아요." };
  }

  return { ok: true, value: parsed.data };
}
