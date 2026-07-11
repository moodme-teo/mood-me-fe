import "server-only";

import type { Journey } from "@/lib/mood-test/journey";
import { buildBoardPrompt } from "@/lib/moodboard/build-board-prompt";
import { generateBoardImage } from "@/lib/moodboard/generate-board-image";
import type { MoodboardElement } from "@/types/moodboard";

export type AssembleBoardResult = {
  elements: MoodboardElement[];
  baseImageUrl: string;
};

// 여정 → 규칙 기반 프롬프트 → gpt-image-2 단일 호출로 보드 이미지 전체를 생성한다
// (moodboard-creation.md §보드 이미지 생성 흐름). 큐레이션 타일·히어로 컷·Konva 텍스트
// 조립은 더 이상 없다 — gpt-image-2가 돌려준 이미지 한 장이 곧 보드 전체이고, 텍스트도
// 그 안에 이미 그려져 있다. elements는 비워서 반환 — 사용자가 편집 화면에서 직접 얹는
// 스티커·텍스트·펜만 여기 채워진다.
export async function assembleBoard(
  journey: Journey,
): Promise<AssembleBoardResult> {
  const prompt = buildBoardPrompt(journey);
  const baseImageUrl = await generateBoardImage(prompt);
  return { elements: [], baseImageUrl };
}
