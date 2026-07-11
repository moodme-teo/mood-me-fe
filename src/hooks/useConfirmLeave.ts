"use client";

import { useEffect, useState } from "react";

// 브라우저 뒤로가기·앞으로가기는 헤더의 뒤로 버튼과 달리 곧장 화면을 떠나 버린다 — 더미
// history 항목을 하나 쌓아 두고, popstate 가 오면 실제로 이동하는 대신 확인 다이얼로그를
// 띄워 두 경로의 이탈 UX를 통일한다. 새로고침 · 탭 닫기는 브라우저가 직접 처리해 커스텀
// 모달을 띄울 수 없으므로 beforeunload 로 네이티브 확인창을 띄운다.
// enabled=false 인 동안은 아무 것도 하지 않는다(더 지킬 상태가 없어졌을 때 — 완료·실패 등).
export function useConfirmLeave(enabled: boolean) {
  const [isLeaveOpen, setIsLeaveOpen] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    window.history.pushState(null, "", window.location.href);

    const handlePopState = () => {
      window.history.pushState(null, "", window.location.href);
      setIsLeaveOpen(true);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [enabled]);

  return { isLeaveOpen, setIsLeaveOpen };
}
