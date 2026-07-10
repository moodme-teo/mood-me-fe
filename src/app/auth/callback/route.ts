import { NextResponse } from "next/server";

import { claimGuestData } from "@/lib/auth/claim-guest-data";
import {
  clearGuestSessionCookie,
  readGuestSessionId,
} from "@/lib/auth/guest-cookie";
import { createClient } from "@/lib/supabase/server";

// 카카오/구글 OAuth 콜백. PRD 5.1 — 성공 시 직전 화면(메인/홈)으로 복귀, 실패/취소 시
// 로그인 화면으로 돌아가 에러를 보여준다 (PRD 10 엣지 케이스).
//
// 로그인 직후 게스트 시절의 세션·보드를 계정으로 옮긴다 — 옮기지 않으면 소유자 검증(#126)이
// 방금 로그인한 본인을 자기 결과에서 막아낸다.
// 이전에 실패해도 로그인 자체는 성공시킨다 — 로그인을 막는 것보다 낫다. 쿠키는 이전이
// 끝났을 때만 지운다(남겨두면 다음 로그인에서 다시 시도한다).
async function claimGuestSessionFor(userId: string | undefined) {
  if (!userId) return;

  const guestSessionId = await readGuestSessionId();
  if (!guestSessionId) return;

  const claimed = await claimGuestData(userId, guestSessionId);
  if (!claimed.ok) {
    console.error("[auth.callback] 게스트 데이터 이전 실패", claimed.error);
    return;
  }

  await clearGuestSessionCookie();
}

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
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      await claimGuestSessionFor(data.user?.id);
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
