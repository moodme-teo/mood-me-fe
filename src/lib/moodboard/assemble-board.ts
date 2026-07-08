import "server-only";

import { pickObjects, pickTiles } from "@/lib/moodboard/curation-library";
import type { PersonaScores } from "@/lib/moodboard/curation-library";
import { generateHeroImage } from "@/lib/moodboard/generate-hero-image";
import {
  assembleCentralTitleRadialLayout,
  getToneTextureUrl,
} from "@/lib/moodboard/layout-central-title-radial";
import type { MoodAnalysis } from "@/lib/prompts";
import type { MoodboardElement } from "@/types/moodboard";

const TILE_SLOT_COUNT = 4; // 히어로(AI 컷) 1 + 큐레이션 타일 4 = 타일 슬롯 5
const OBJECT_SLOT_COUNT = 2;

export type AssembleBoardResult = {
  elements: MoodboardElement[];
  baseImageUrl: string;
};

// 확신 카드 → 큐레이션 타일, 열망(image_prompt) → AI 컷으로 보드를 조립한다
// (docs/work/todo/moodboard-generation.md 생성 확정안). 레이아웃은 중앙 타이틀
// 방사형 1종 고정(#41 구간 3 결과 대기) — layout-central-title-radial.ts 참고.
export async function assembleBoard(
  moodProfile: MoodAnalysis,
  personaScores: PersonaScores,
): Promise<AssembleBoardResult> {
  const tiles = pickTiles(personaScores, TILE_SLOT_COUNT);
  const objects = pickObjects(personaScores, OBJECT_SLOT_COUNT);
  const heroImageSrc = await generateHeroImage(moodProfile.image_prompt);

  const elements = assembleCentralTitleRadialLayout({
    heroImageSrc,
    tiles,
    objects,
    title: moodProfile.title,
    typeName: moodProfile.type_name,
    stickerPhrases: moodProfile.sticker_phrases,
  });

  return { elements, baseImageUrl: getToneTextureUrl() };
}
