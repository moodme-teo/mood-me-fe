// 큐레이션 라이브러리 — moodboard-library-collection.md 수집 대장의 최소 세트(#41 구간 3용,
// 7/8 생성 완료분) 그대로 반영. 전체 80장 중 15장 + 오브제 5개만 실제 수집돼 있다 — 다른
// 페르소나 조합 여정은 이 풀 안에서 최선 매칭한다 (docs/work/todo/moodboard-generation.md).

export type TileOrientation = "square" | "landscape" | "portrait";

export type CurationTile = {
  id: string;
  label: string;
  orientation: TileOrientation;
  promptTags: string[];
  personaWeights: Record<string, number>;
};

export type CurationObject = {
  id: string;
  label: string;
  personaTags: string[];
};

function tilePath(id: string) {
  return `/test-image/board/${id}.jpg`;
}

function objectPath(id: string) {
  return `/test-image/board-asset/object/${id}.png`;
}

function stickerFramePath(id: string) {
  return `/test-image/board-asset/sticker/${id}.svg`;
}

export const CURATION_TILES: CurationTile[] = [
  {
    id: "b21",
    label: "만년필과 잉크병",
    orientation: "square",
    promptTags: ["fountain pen", "ink bottle", "parchment"],
    personaWeights: { "다크 아카데미아": 0.8, "네오 로맨틱": 0.2 },
  },
  {
    id: "b22",
    label: "체스판과 촛불",
    orientation: "landscape",
    promptTags: ["chessboard", "candlelight", "dark wood"],
    personaWeights: { "다크 아카데미아": 0.7, "올드 머니": 0.3 },
  },
  {
    id: "b23",
    label: "비 오는 창가 독서등",
    orientation: "portrait",
    promptTags: ["rainy window", "desk lamp", "books"],
    personaWeights: { "다크 아카데미아": 0.6, "코지 홈바디": 0.4 },
  },
  {
    id: "b30",
    label: "수제 잼 병과 깅엄 천",
    orientation: "square",
    promptTags: ["homemade jam jars", "gingham cloth"],
    personaWeights: { 코티지코어: 0.7, "코지 홈바디": 0.3 },
  },
  {
    id: "b32",
    label: "장작 난로와 주전자",
    orientation: "portrait",
    promptTags: ["wood stove", "kettle", "cottage kitchen"],
    personaWeights: { 코티지코어: 0.6, "코지 홈바디": 0.4 },
  },
  {
    id: "b33",
    label: "이슬 맺힌 거미줄",
    orientation: "square",
    promptTags: ["dew", "spiderweb", "morning light macro"],
    personaWeights: { 페어리코어: 0.8, 스피리추얼: 0.2 },
  },
  {
    id: "b35",
    label: "프리즘 빛망울 커튼",
    orientation: "portrait",
    promptTags: ["prism rainbow bokeh", "sheer curtain"],
    personaWeights: { 페어리코어: 0.7, "네오 로맨틱": 0.3 },
  },
  {
    id: "b45",
    label: "백라이트 키보드",
    orientation: "landscape",
    promptTags: ["mechanical keyboard", "backlight", "dark"],
    personaWeights: { "테크 노어": 0.8, "커리어 보스": 0.2 },
  },
  {
    id: "b53",
    label: "마른 장미 다발",
    orientation: "portrait",
    promptTags: ["dried roses", "muted tone"],
    personaWeights: { "네오 로맨틱": 0.7, 코케트: 0.3 },
  },
  {
    id: "b54",
    label: "역광의 시어 드레스 자락",
    orientation: "portrait",
    promptTags: ["sheer dress hem", "backlit", "soft"],
    personaWeights: { "네오 로맨틱": 0.8, 페어리코어: 0.2 },
  },
  {
    id: "b61",
    label: "새벽 스카이라인 사무실 창",
    orientation: "landscape",
    promptTags: ["office window", "city skyline", "dawn"],
    personaWeights: { "커리어 보스": 0.7, "테크 노어": 0.3 },
  },
  {
    id: "b76",
    label: "보름달 뜬 창과 실루엣",
    orientation: "portrait",
    promptTags: ["full moon window", "silhouette", "night"],
    personaWeights: { 스피리추얼: 0.6, "네오 로맨틱": 0.4 },
  },
  {
    id: "b77",
    label: "뜨개질하는 손과 실뭉치",
    orientation: "square",
    promptTags: ["knitting hands", "yarn", "cozy"],
    personaWeights: { "코지 홈바디": 0.7, 코티지코어: 0.3 },
  },
  {
    id: "b78",
    label: "김 나는 머그와 양말 신은 발",
    orientation: "portrait",
    promptTags: ["steaming mug", "wool socks", "blanket"],
    personaWeights: { "코지 홈바디": 0.8, 코티지코어: 0.2 },
  },
  {
    id: "b80",
    label: "오븐 속 쿠키 온기",
    orientation: "landscape",
    promptTags: ["cookies baking", "oven warm glow"],
    personaWeights: { "코지 홈바디": 0.7, 코케트: 0.3 },
  },
];

export const CURATION_OBJECTS: CurationObject[] = [
  { id: "o01", label: "네잎클로버", personaTags: ["러키걸", "코티지코어"] },
  { id: "o04", label: "나비", personaTags: ["페어리코어", "네오 로맨틱"] },
  { id: "o08", label: "수정 원석", personaTags: ["스피리추얼"] },
  {
    id: "o18",
    label: "낡은 책",
    personaTags: ["다크 아카데미아", "라이트 아카데미아"],
  },
  {
    id: "o19",
    label: "만년필",
    personaTags: ["다크 아카데미아", "커리어 보스"],
  },
];

// 문구 스티커 프레임 3종 — 실제 문구(mood_profile.sticker_phrases)는 Konva Text로 얹고,
// 이 에셋은 배경(포스트잇/티켓/테이프라벨)만 담당한다.
export const STICKER_FRAMES = [
  { id: "s01", kind: "postit" as const },
  { id: "s05", kind: "ticket" as const },
  { id: "s06", kind: "tapelabel" as const },
];

// 톤 프리셋 — 수집된 게 웜 크래프트 1종뿐이라(#41 구간 3 결과 대기 중) 고정값.
export const TONE_PRESET = {
  name: "웜 크래프트",
  textureUrl: "/test-image/board-asset/texture/t01.jpg",
};

export { tilePath, objectPath, stickerFramePath };

function tileScore(tile: CurationTile, combinedScores: Record<string, number>) {
  return Object.entries(tile.personaWeights).reduce(
    (score, [persona, weight]) =>
      score + (combinedScores[persona] ?? 0) * weight,
    0,
  );
}

function objectScore(
  object: CurationObject,
  combinedScores: Record<string, number>,
) {
  return object.personaTags.reduce(
    (score, persona) => score + (combinedScores[persona] ?? 0),
    0,
  );
}

export type PersonaScores = {
  core_scores: Record<string, number>;
  theme_scores: Record<string, number>;
};

// persona_scores(core_scores + theme_scores 상위 3씩)를 하나로 합쳐 라이브러리 매칭에 쓴다.
function combineScores(personaScores: PersonaScores): Record<string, number> {
  return { ...personaScores.core_scores, ...personaScores.theme_scores };
}

// 상위 count장을 점수 내림차순으로 고른다. 동점/매칭 없음 대비로 나머지는 라이브러리
// 순서대로 채워 항상 count장을 반환한다(빈 슬롯 방지).
export function pickTiles(
  personaScores: PersonaScores,
  count: number,
): CurationTile[] {
  const combined = combineScores(personaScores);
  const ranked = [...CURATION_TILES].sort(
    (a, b) => tileScore(b, combined) - tileScore(a, combined),
  );
  return ranked.slice(0, count);
}

export function pickObjects(
  personaScores: PersonaScores,
  count: number,
): CurationObject[] {
  const combined = combineScores(personaScores);
  const ranked = [...CURATION_OBJECTS].sort(
    (a, b) => objectScore(b, combined) - objectScore(a, combined),
  );
  return ranked.slice(0, count);
}
