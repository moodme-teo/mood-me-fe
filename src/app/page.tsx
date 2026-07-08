import HomeExperience from "@/app/_components/HomeExperience";
import { getMoodboardSummaries } from "@/lib/moodboard/list";
import type { MoodboardSummary } from "@/lib/moodboard/summary";
import { createClient } from "@/lib/supabase/server";

function canUseSupabase() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export default async function HomePage() {
  let isLoggedIn = false;
  let initialError: string | null = null;
  let initialMoodboards: MoodboardSummary[] = [];

  if (canUseSupabase()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    isLoggedIn = !!user;
  }

  const moodboardsResult = await getMoodboardSummaries();
  if (moodboardsResult.ok) {
    initialMoodboards = moodboardsResult.value;
  } else {
    initialError = moodboardsResult.error;
  }

  return (
    <HomeExperience
      initialError={initialError}
      initialMoodboards={initialMoodboards}
      isLoggedIn={isLoggedIn}
    />
  );
}
