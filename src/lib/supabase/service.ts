import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// 서비스 롤 클라이언트 — RLS를 우회한다. Route Handler 안에서만 사용할 것
// (mood_test_sessions 등은 anon/authenticated 접근을 RLS로 전면 차단해뒀다, #42).
// 절대 클라이언트 번들에 노출하지 말 것 — SUPABASE_SECRET_KEY는 서버 전용.
export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } }
  );
}
