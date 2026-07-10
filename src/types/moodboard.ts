export const MOODBOARD_WIDTH = 360;
export const MOODBOARD_HEIGHT = 640;
export const EXPORT_PIXEL_RATIO = 2;

type BaseMoodboardElement = {
  id: string;
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  z_index: number;
};

export type StickerAssetId =
  "silver-star" | "dream-label" | "soft-orbit" | "lucky-ribbon" | "quiet-spark";

export type StickerElement = BaseMoodboardElement & {
  type: "sticker";
  properties: {
    assetId: StickerAssetId;
    width: number;
    height: number;
  };
};

export type TextElement = BaseMoodboardElement & {
  type: "text";
  properties: {
    content: string;
    fontFamily: string;
    fontSize: number;
    color: string;
    align: "left" | "center" | "right";
    width: number;
  };
};

export type PenElement = BaseMoodboardElement & {
  type: "pen";
  properties: {
    points: number[];
    stroke: string;
    strokeWidth: number;
  };
};

// 큐레이션 타일·AI 생성 컷 등 임의 이미지 요소 (#37 — 보드 조립이 채우는 슬롯).
export type ImageElement = BaseMoodboardElement & {
  type: "image";
  properties: {
    src: string;
    width: number;
    height: number;
  };
};

export type MoodboardElement =
  StickerElement | TextElement | PenElement | ImageElement;

export type MoodVector = {
  calm_energy: number;
  warm_cool: number;
  minimal_maximal: number;
  vintage_modern: number;
  real_dreamy: number;
};

export type MoodProfile = {
  title: string;
  type_name: string;
  reading: {
    conviction: string;
    desire: string;
    showdown: string;
  };
  mood_vector: MoodVector;
  keywords: string[];
  sticker_phrases: string[];
};

// 분석 갈래(GPT-5 리포트) 진행 상태 — 이미지 갈래(job.status)와 독립적이다. moodProfile이
// null인 것만으로는 "아직 안 끝남"과 "실패"를 구별할 수 없어 따로 둔다 (#122).
export type AnalysisStatus = "queued" | "processing" | "completed" | "failed";

// 크롭 에디터 배경 옵션 (mood-edit PRD §3.3/§3.4). components/canvas/types.ts의
// CropBackground와 같은 모양이지만, lib/types는 components를 import할 수 없어(단방향)
// 여기 별도로 둔다.
export type BackgroundOption =
  { type: "transparent" } | { type: "solid"; color: string } | { type: "blur" };

// 재편집 구도 복원용 — 평면 이미지만으로는 도형·배경·확대·위치를 되살릴 수 없다
// (mood-edit PRD §12). shapeId는 CropShapeId 값을 그대로 담되, 도형 목록이 캔버스
// 쪽에서 확장돼도 이 타입은 영향받지 않도록 string으로 둔다.
export type EditState = {
  sourceImageUrl: string;
  shapeId: string;
  background: BackgroundOption;
  scale: number;
  x: number;
  y: number;
};

export type Moodboard = {
  id: string;
  baseImageUrl: string;
  elements: MoodboardElement[];
  // 크롭 에디터(#99)가 저장한 평면 결과 이미지. 있으면 결과 화면이 이 이미지를 그대로 보여준다.
  exportedImageUrl?: string | null;
  // 재편집 시 구도 복원용 (#116). 레거시 보드는 null — 기본값으로 진입한다.
  editState?: EditState | null;
  moodProfile: MoodProfile;
  // 분석 갈래 상태(#122). 이 컬럼이 생기기 전에 저장된 레거시 보드는 null.
  analysisStatus: AnalysisStatus | null;
  isGuest: boolean;
  updatedAt: string;
};
