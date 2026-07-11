import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

// Supabase Auth 세션 쿠키 갱신. Next.js 16부터 middleware.ts가 proxy.ts로 이름이 바뀌었다
// (동작은 동일). 매 요청마다 세션 토큰을 갱신해 서버 컴포넌트/Route Handler가 항상
// 최신 로그인 상태를 볼 수 있게 한다 — 로그인 로직 자체는 여기 두지 않는다.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getUser()는 토큰을 검증하며 필요 시 갱신한다 — getSession()과 달리 매번 서버에 확인하므로
  // 여기서 반드시 호출해야 세션이 만료 없이 유지된다. (Supabase SSR 공식 패턴)
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
