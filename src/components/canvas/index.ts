"use client";

import dynamic from "next/dynamic";

// react-konva 는 SSR 불가 → 반드시 ssr:false 로 로드.
// 페이지에서: import { BoardCanvas } from "@/components/canvas";
export const BoardCanvas = dynamic(() => import("./BoardCanvas"), {
  ssr: false,
});
