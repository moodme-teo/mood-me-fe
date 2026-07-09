"use client";

// PRD 5.4 F-14 — 위트있는 상태 문구를 2~3초 간격으로 로테이션.
import { useEffect, useState } from "react";

const MESSAGES = [
  "당신이 고른 공기를 모으는 중…",
  "색과 결을 섞고 있어요…",
  "흩어진 조각들을 이어붙이는 중…",
  "빛을 조금 더 얹는 중…",
  "거의 다 됐어요, 마지막 손질 중…",
];

const ROTATE_INTERVAL_MS = 2500;

export default function GeneratingMessages() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % MESSAGES.length);
    }, ROTATE_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <p role="status" className="text-sm text-muted-foreground">
      {MESSAGES[index]}
    </p>
  );
}
