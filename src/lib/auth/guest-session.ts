// 클라이언트 게스트 세션 유틸. localStorage에 guest_session_id가 있으면 재사용하고,
// 없으면 POST /api/guest-sessions로 발급받아 저장한다. 브라우저 전용 — 클라이언트
// 컴포넌트('use client')에서만 호출할 것.

import { apiClient } from "@/lib/api-client";

const STORAGE_KEY = "mood-me:guest-session-id";

export function getStoredGuestSessionId(): string | null {
  return window.localStorage.getItem(STORAGE_KEY);
}

export async function ensureGuestSessionId(): Promise<string> {
  const existing = getStoredGuestSessionId();
  if (existing) return existing;

  const { id } = await apiClient.post<{ id: string }>("/api/guest-sessions");
  window.localStorage.setItem(STORAGE_KEY, id);
  return id;
}
