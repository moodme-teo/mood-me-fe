import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { validateJourney, type Journey } from "@/lib/mood-test/journey";

type RequestBody = {
  sessionId?: string;
  guestSessionId?: string;
  journey?: Journey;
};

// PRD §5.7 저장 원칙: 서버에는 완성본만 커밋한다. 진행 중 상태는 클라이언트가
// store/localStorage로만 관리하고(#35), 테스트 완료 시점에 이 엔드포인트를 한 번만 호출한다.
// sessionId는 클라이언트가 이미 /test/[sessionId]에서 쓰던 값을 그대로 넘긴다 — 세션 생성을
// 미리 요청하는 별도 호출은 없다.
export async function POST(request: Request) {
  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "유효한 JSON body가 필요합니다" }, { status: 400 });
  }

  const { sessionId, guestSessionId, journey } = body;

  if (!sessionId || typeof sessionId !== "string") {
    return NextResponse.json({ error: "sessionId가 필요합니다" }, { status: 400 });
  }
  if (!journey || typeof journey !== "object") {
    return NextResponse.json({ error: "journey가 필요합니다" }, { status: 400 });
  }

  const validation = validateJourney(journey);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  // 로그인 여부는 서버가 인증 세션(쿠키)으로 직접 확인한다 — user_id를 클라이언트가
  // 요청 본문에 자칭하도록 두지 않는다. 로그인 상태가 아니면 게스트로 취급한다.
  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user && (!guestSessionId || typeof guestSessionId !== "string")) {
    return NextResponse.json(
      { error: "로그인 상태가 아니면 guestSessionId가 필요합니다" },
      { status: 400 }
    );
  }

  const service = createServiceClient();

  // guest_sessions 발급 엔드포인트(POST /guest-sessions)가 아직 없어서, 게스트 세션
  // row가 없으면 여기서 즉시 만들어준다 (FK 충족용 임시 조치 — 발급 엔드포인트가 생기면
  // 이 upsert는 항상 no-op이 된다).
  if (!user && guestSessionId) {
    const { error: guestError } = await service
      .from("guest_sessions")
      .upsert({ id: guestSessionId }, { onConflict: "id", ignoreDuplicates: true });
    if (guestError) {
      return NextResponse.json({ error: guestError.message }, { status: 500 });
    }
  }

  const { data, error } = await service
    .from("mood_test_sessions")
    .upsert(
      {
        id: sessionId,
        user_id: user?.id ?? null,
        guest_session_id: user ? null : guestSessionId,
        status: "completed",
        journey,
      },
      { onConflict: "id" }
    )
    .select("id, status")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
