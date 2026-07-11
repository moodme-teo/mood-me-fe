"use client";

// PRD 5.4 F-14 — 위트있는 상태 문구를 2~3초 간격으로 로테이션.
import { useEffect, useState } from "react";

const MESSAGES = [
  "고른 답들 사이에서 취향을 찾는 중…",
  "당신이 원하는 분위기를 좁혀가는 중…",
  "추구미에 어울리는 장면을 모으는 중…",
  "사진과 문구를 한 장에 맞춰보는 중…",
  "당신의 추구미보드가 거의 완성됐어요…",
];

const ROTATE_INTERVAL_MS = 2500;

// 재진입(새로고침·뒤로가기)으로 기존 job을 이어 폴링하는 중에는 "새로 만드는 중"이라는
// 인상을 주는 로테이션 문구 대신 이 고정 문구를 보여준다(#115 문구, PRD §10.3).
const REENTRY_MESSAGE = "만들던 무드보드를 다시 불러오고 있어요.";

export default function GeneratingMessages({
  isReentry = false,
}: {
  isReentry?: boolean;
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (isReentry) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % MESSAGES.length);
    }, ROTATE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [isReentry]);

  return (
    <p role="status" className="text-muted-foreground text-body-sm">
      {isReentry ? REENTRY_MESSAGE : MESSAGES[index]}
    </p>
  );
}
