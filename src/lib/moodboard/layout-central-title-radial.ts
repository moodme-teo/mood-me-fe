// 레이아웃 아키타입 "중앙 타이틀 방사형" — moodboard-generation.md의 6종 아키타입 중
// "가장 흔함"으로 명시된 것 + docs/work/todo/moodboard-assembly-mockup.html의 여정 B
// (다크 아카데미아 × 커리어 보스) 좌표를 캔버스(360×640) 비율로 스케일링해 일반화했다.
// #41 구간 3(아키타입 3종 비교 → 템플릿 우선순위)이 끝나면 이 파일 옆에 다른 아키타입을
// 추가하는 식으로 확장한다 — 지금은 이 1종만 구현.

import {
  type CurationObject,
  type CurationTile,
  objectPath,
  stickerFramePath,
  tilePath,
  TONE_PRESET,
} from "@/lib/moodboard/curation-library";
import type { MoodboardElement } from "@/types/moodboard";
import { MOODBOARD_HEIGHT, MOODBOARD_WIDTH } from "@/types/moodboard";

// 목업 스테이지(560×720) → 실제 캔버스 비율
const MOCKUP_STAGE_WIDTH = 560;
const MOCKUP_STAGE_HEIGHT = 720;
const SCALE_X = MOODBOARD_WIDTH / MOCKUP_STAGE_WIDTH;
const SCALE_Y = MOODBOARD_HEIGHT / MOCKUP_STAGE_HEIGHT;

// 타일 세로:가로 비율 근사치 (수집 대장의 "비율" 컬럼 기준)
const ORIENTATION_RATIO: Record<CurationTile["orientation"], number> = {
  square: 1.0,
  landscape: 0.72,
  portrait: 1.3,
};

type TileSlot = { x: number; y: number; w: number; r: number };
type ObjectSlot = { x: number; y: number; w: number; r: number };
type StickerSlot = { x: number; y: number; w: number; h: number; r: number };

// 여정 B 목업 좌표 그대로 — 히어로(1번)가 가장 크고 먼저 오는 슬롯.
const TILE_SLOTS: TileSlot[] = [
  { x: 30, y: 40, w: 200, r: -3 },
  { x: 360, y: 70, w: 175, r: 4 },
  { x: 20, y: 470, w: 210, r: 3 },
  { x: 340, y: 440, w: 200, r: -4 },
  { x: 360, y: 250, w: 180, r: 6 },
];

const OBJECT_SLOTS: ObjectSlot[] = [
  { x: 60, y: 330, w: 150, r: -6 },
  { x: 230, y: 560, w: 120, r: 8 },
];

// 목업은 스티커 1개뿐이지만 스펙(moodboard-generation.md)은 "기본 2~4개"를 요구한다 —
// 목업에 없는 슬롯 2개는 타일이 안 겹치는 빈 공간(상단 좌측 · 하단 중앙)에 추가했다.
const STICKER_SLOTS: StickerSlot[] = [
  { x: 150, y: 60, w: 200, h: 88, r: -3 },
  { x: 210, y: 590, w: 150, h: 64, r: 4 },
  { x: 10, y: 260, w: 130, h: 60, r: -6 },
];

const TITLE_POSITION = { x: 180, y: 300 };

const STICKER_FRAME_CYCLE = ["s01", "s05", "s06"];

function scaleX(value: number) {
  return value * SCALE_X;
}
function scaleY(value: number) {
  return value * SCALE_Y;
}

let elementCounter = 0;
function nextId(prefix: string) {
  elementCounter += 1;
  return `${prefix}-${elementCounter}`;
}

export type AssembleLayoutInput = {
  heroImageSrc: string; // AI 생성 컷 (히어로 슬롯 전용)
  tiles: CurationTile[]; // 큐레이션 타일 (히어로 제외 나머지 슬롯 채움, 최대 4장 사용)
  objects: CurationObject[]; // 최대 2개 사용
  title: string; // mood_profile.title
  typeName: string; // mood_profile.type_name
  stickerPhrases: string[]; // mood_profile.sticker_phrases (2~4개 배치)
};

export function assembleCentralTitleRadialLayout(
  input: AssembleLayoutInput,
): MoodboardElement[] {
  elementCounter = 0;
  const elements: MoodboardElement[] = [];
  let z = 1;

  // 1. 히어로 슬롯 = AI 컷 (moodboard-generation.md: "히어로 슬롯 = AI 컷")
  const heroSlot = TILE_SLOTS[0];
  const heroWidth = scaleX(heroSlot.w);
  elements.push({
    id: nextId("image"),
    type: "image",
    x: scaleX(heroSlot.x),
    y: scaleY(heroSlot.y),
    rotation: heroSlot.r,
    scaleX: 1,
    scaleY: 1,
    z_index: z++,
    properties: {
      src: input.heroImageSrc,
      width: heroWidth,
      height: heroWidth * 1.15,
    },
  });

  // 2. 나머지 타일 슬롯 = 큐레이션 타일
  const remainingSlots = TILE_SLOTS.slice(1);
  remainingSlots.forEach((slot, i) => {
    const tile = input.tiles[i];
    if (!tile) return;
    const width = scaleX(slot.w);
    elements.push({
      id: nextId("image"),
      type: "image",
      x: scaleX(slot.x),
      y: scaleY(slot.y),
      rotation: slot.r,
      scaleX: 1,
      scaleY: 1,
      z_index: z++,
      properties: {
        src: tilePath(tile.id),
        width,
        height: width * ORIENTATION_RATIO[tile.orientation],
      },
    });
  });

  // 3. 오브제 컷아웃
  OBJECT_SLOTS.forEach((slot, i) => {
    const object = input.objects[i];
    if (!object) return;
    const width = scaleX(slot.w);
    elements.push({
      id: nextId("image"),
      type: "image",
      x: scaleX(slot.x),
      y: scaleY(slot.y),
      rotation: slot.r,
      scaleX: 1,
      scaleY: 1,
      z_index: z++,
      properties: {
        src: objectPath(object.id),
        width,
        height: width * 1.2,
      },
    });
  });

  // 4. 문구 스티커 (프레임 이미지 + 텍스트 오버레이 조합)
  const phrases = input.stickerPhrases.slice(0, STICKER_SLOTS.length);
  phrases.forEach((phrase, i) => {
    const slot = STICKER_SLOTS[i];
    const frame = STICKER_FRAME_CYCLE[i % STICKER_FRAME_CYCLE.length];
    const width = scaleX(slot.w);
    const height = scaleY(slot.h);
    const x = scaleX(slot.x);
    const y = scaleY(slot.y);

    elements.push({
      id: nextId("image"),
      type: "image",
      x,
      y,
      rotation: slot.r,
      scaleX: 1,
      scaleY: 1,
      z_index: z++,
      properties: { src: stickerFramePath(frame), width, height },
    });
    elements.push({
      id: nextId("text"),
      type: "text",
      x,
      y: y + height / 2 - 12,
      rotation: slot.r,
      scaleX: 1,
      scaleY: 1,
      z_index: z++,
      properties: {
        content: phrase,
        fontFamily: "Arial",
        fontSize: 15,
        color: "#4a3f1e",
        align: "center",
        width,
      },
    });
  });

  // 5. 중앙 타이틀 — mood_profile.title(메인) + type_name(서브)
  const titleX = scaleX(TITLE_POSITION.x);
  const titleY = scaleY(TITLE_POSITION.y);
  elements.push({
    id: nextId("text"),
    type: "text",
    x: titleX,
    y: titleY,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    z_index: z++,
    properties: {
      content: input.title,
      fontFamily: "Arial",
      fontSize: 26,
      color: "#3a2f1f",
      align: "center",
      width: MOODBOARD_WIDTH - titleX,
    },
  });
  elements.push({
    id: nextId("text"),
    type: "text",
    x: titleX,
    y: titleY + 40,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    z_index: z++,
    properties: {
      content: input.typeName,
      fontFamily: "Arial",
      fontSize: 13,
      color: "#7a6a52",
      align: "center",
      width: MOODBOARD_WIDTH - titleX,
    },
  });

  return elements;
}

export function getToneTextureUrl(): string {
  return TONE_PRESET.textureUrl;
}
