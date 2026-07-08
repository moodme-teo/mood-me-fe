import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

// 카카오/구글 OAuth 콜백. PRD 5.1 — 성공 시 직전 화면(메인/홈)으로 복귀, 실패/취소 시
// 로그인 화면으로 돌아가 에러를 보여준다 (PRD 10 엣지 케이스).
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);

  const providerError =
    searchParams.get("error_description") ?? searchParams.get("error");
  if (providerError) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(providerError)}`,
    );
  }

  const code = searchParams.get("code");
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(origin);
    }
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error.message)}`,
    );
  }

  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent("로그인에 실패했어요")}`,
  );
}
