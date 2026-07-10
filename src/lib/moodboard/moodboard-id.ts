// 테스트 세션 하나에 무드보드 하나. sessionId에서 결정적으로 유도한다.
//
// 예전에는 편집 화면에 들어올 때마다 randomUUID()로 새 id를 뽑았다. 그러면 저장할 때마다
// 보드 row가 하나씩 늘고, id가 매번 새것이라 소유자 검증이 걸릴 자리도 없었다 (#126).
//
// sessionId를 그대로 쓰지 않는 이유: 공유 링크(/moodboard/{id})에 테스트 세션 id가 노출된다.
// RFC 4122 v5(SHA-1 + 네임스페이스)로 단방향 유도해 두 값을 분리한다.

import "server-only";

import { createHash } from "node:crypto";

// 이 앱 전용 네임스페이스. 바꾸면 기존 보드와 세션의 연결이 끊긴다.
const MOODBOARD_NAMESPACE = "6f9c1d2e-3a47-4b58-9c60-7d81e2f3a4b5";

function uuidToBytes(uuid: string): Buffer {
  return Buffer.from(uuid.replace(/-/g, ""), "hex");
}

function bytesToUuid(bytes: Buffer): string {
  const hex = bytes.toString("hex");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join("-");
}

export function deriveMoodboardId(sessionId: string): string {
  const hash = createHash("sha1")
    .update(uuidToBytes(MOODBOARD_NAMESPACE))
    .update(Buffer.from(sessionId, "utf8"))
    .digest();

  const bytes = hash.subarray(0, 16);
  // version 5 (상위 4비트) + RFC 4122 variant (상위 2비트)
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  return bytesToUuid(bytes);
}
