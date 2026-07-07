"use client";

import dynamic from "next/dynamic";

export type { MoodboardElement } from "@/types/moodboard";

// react-konva 는 SSR 불가 → 반드시 ssr:false 로 로드.
// 페이지에서: import { BoardCanvas } from "@/components/canvas";
export const BoardCanvas = dynamic(() => import("./BoardCanvas"), {
  ssr: false,
});
