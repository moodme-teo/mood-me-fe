"use client";

import { useEffect } from "react";

// 홈은 여정의 시작점이다 — 여기서 브라우저 뒤로가기는 앱 밖(이전 사이트/빈 탭)으로
// 나가버려 사용자를 잃는다. 그래서 홈에 진입하면 히스토리에 사본 항목을 하나 심어두고,
// 뒤로가기로 그 사본이 빠질 때마다(popstate) 곧바로 다시 심어 제자리에 붙잡는다.
// 결과적으로 홈에서의 뒤로가기는 아무 동작도 하지 않는다.
// 언마운트(홈을 떠나 다른 화면으로 이동) 시 리스너를 걷어 정상 내비게이션을 되돌린다.
export function useBlockBackNavigation() {
  useEffect(() => {
    window.history.pushState(null, "", window.location.href);

    const handlePopState = () => {
      window.history.pushState(null, "", window.location.href);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);
}
