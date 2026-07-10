// 생성중 화면 재진입 시 새 job을 만들지 않기 위한 로컬 보존 (#115).
// 세션당 하나의 jobId만 기억하면 된다 — getGenerationJob이 jobId가 아니라
// sessionId 기준으로 "이 세션의 최신 job"을 조회하므로, 여기 저장된 값은
// "이미 이 세션에 생성 요청을 보냈다"는 사실만 있으면 충분하다.
const STORAGE_KEY_PREFIX = "mood-me:generation-job:";

export function loadGenerationJobId(sessionId: string): string | null {
  try {
    return window.localStorage.getItem(`${STORAGE_KEY_PREFIX}${sessionId}`);
  } catch {
    return null;
  }
}

export function saveGenerationJobId(sessionId: string, jobId: string): void {
  try {
    window.localStorage.setItem(`${STORAGE_KEY_PREFIX}${sessionId}`, jobId);
  } catch {
    // localStorage 접근 실패(프라이빗 모드 등) — 재진입 보존만 못 할 뿐,
    // 이번 생성 자체는 정상 진행된다.
  }
}

// 같은 sessionId로 journey를 다시 제출할 때(TestLayout) 호출한다 — upsert라 sessionId가
// 안 바뀌므로, 지우지 않으면 재진입 로직이 새 답변 대신 옛 job(옛 답변 결과)을 그대로
// 재사용해버린다. "새 답변을 냈다"가 이 캐시를 무효화하는 시점이다.
export function clearGenerationJobId(sessionId: string): void {
  try {
    window.localStorage.removeItem(`${STORAGE_KEY_PREFIX}${sessionId}`);
  } catch {
    // no-op
  }
}
