import { moodboardSchema } from "@/lib/api/get-moodboard";
import { updateMoodboardRequestSchema } from "@/lib/api/update-moodboard";
import { apiError, apiSuccess } from "@/lib/api-response";
import { getRequester } from "@/lib/auth/requester";
import { deleteOwnedMoodboard } from "@/lib/moodboard/delete-moodboard";
import { getMoodboardById } from "@/lib/moodboard/get-moodboard";
import { isMoodboardOwner } from "@/lib/moodboard/moodboard-owner";
import { saveOwnedMoodboard } from "@/lib/moodboard/save-moodboard";

function canUseSupabaseService() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SECRET_KEY,
  );
}

const SAVE_ERROR_STATUS = {
  // 남의 보드에 저장을 시도해도 존재 여부를 흘리지 않는다 (#126).
  NOT_FOUND: 404,
  INTERNAL_ERROR: 500,
} as const;

const DELETE_ERROR_STATUS = {
  NOT_FOUND: 404,
  INTERNAL_ERROR: 500,
} as const;

// moodboards.id는 uuid PK — 비-UUID id(테스트/목 흐름의 임의 라우트 등)를 그대로 upsert하면
// Postgres가 "invalid input syntax for type uuid"로 터진다. 저장을 막지 않고 미영속으로 흘려보낸다.
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(value: string) {
  return UUID_PATTERN.test(value);
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ moodboardId: string }> },
) {
  const { moodboardId } = await params;

  const result = await getMoodboardById(moodboardId);
  if (!result.ok) {
    const status = result.code === "NOT_FOUND" ? 404 : 500;
    return apiError(result.code, result.error, status);
  }

  // 보드 조회는 공개다 (PRD §10.1 — 공유 링크). 소유 여부만 서버가 대조해 알려주고,
  // 편집 UI 노출은 클라이언트가 이 값으로 판단한다. 실제 방어는 PATCH의 소유자 검증이다.
  const requester = await getRequester();
  const isOwner = await isMoodboardOwner(moodboardId, requester);

  const parsed = moodboardSchema.safeParse({ ...result.value, isOwner });
  if (!parsed.success) {
    return apiError(
      "INTERNAL_ERROR",
      "무드보드 데이터를 불러오지 못했어요.",
      500,
    );
  }

  return apiSuccess(parsed.data);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ moodboardId: string }> },
) {
  const { moodboardId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("INVALID_INPUT", "유효한 JSON body가 필요합니다", 400);
  }

  const parsed = updateMoodboardRequestSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues
      .map((issue) => issue.message)
      .join("; ");
    return apiError("INVALID_INPUT", message, 400);
  }

  if (!canUseSupabaseService() || !isUuid(moodboardId)) {
    return apiSuccess({
      id: moodboardId,
      baseImageUrl: parsed.data.baseImageUrl,
      elements: parsed.data.elements,
      persisted: false,
    });
  }

  // 소유자(회원·게스트)는 서버가 쿠키로만 확인한다 — 본문에 자칭하도록 두지 않는다 (#126).
  const requester = await getRequester();
  if (requester.kind === "anonymous") {
    return apiError(
      "UNAUTHORIZED",
      "세션이 만료됐어요. 처음부터 다시 시작해 주세요.",
      401,
    );
  }

  const { sessionId, ...saveInput } = parsed.data;
  const result = await saveOwnedMoodboard(moodboardId, requester, {
    ...saveInput,
    testSessionId: sessionId,
  });
  if (!result.ok) {
    return apiError(result.code, result.error, SAVE_ERROR_STATUS[result.code]);
  }

  return apiSuccess({
    id: moodboardId,
    baseImageUrl: parsed.data.baseImageUrl,
    elements: parsed.data.elements,
    persisted: true,
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ moodboardId: string }> },
) {
  const { moodboardId } = await params;

  if (!canUseSupabaseService() || !isUuid(moodboardId)) {
    return apiSuccess({ id: moodboardId, deleted: true });
  }

  // 소유자(회원·게스트)는 서버가 쿠키로만 확인한다 — 본문에 자칭하도록 두지 않는다 (#126).
  const requester = await getRequester();
  if (requester.kind === "anonymous") {
    return apiError("FORBIDDEN", "본인 무드보드만 삭제할 수 있어요.", 403);
  }

  const isOwner = await isMoodboardOwner(moodboardId, requester);
  if (!isOwner) {
    return apiError("FORBIDDEN", "본인 무드보드만 삭제할 수 있어요.", 403);
  }

  const result = await deleteOwnedMoodboard(moodboardId, requester);
  if (!result.ok) {
    return apiError(
      result.code,
      result.error,
      DELETE_ERROR_STATUS[result.code],
    );
  }

  return apiSuccess({ id: moodboardId, deleted: true });
}
