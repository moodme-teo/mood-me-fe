/*
 * mood-me · prototype data
 * ------------------------------------------------------------------
 * 백엔드/AI 없이 전체 여정을 시연하기 위한 목업 데이터.
 * 실제 서비스에서는 이 자리에 mood-test/questions API 응답,
 * Claude 프롬프트 변환 결과, fal.ai 생성 이미지가 들어온다.
 */

// 검증된 Unsplash 이미지 (모두 200 응답 확인됨). 색 블록 플레이스홀더 대신 실제 사진.
const IMG = (id, w = 640) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=75`;

// 다섯 개의 무드 축 — 결과 레이더 차트와 성향 이름을 만든다.
const AXES = [
  { key: "calm", label: "고요" },
  { key: "warm", label: "온기" },
  { key: "dream", label: "몽환" },
  { key: "nature", label: "자연" },
  { key: "vivid", label: "생동" },
];

/*
 * 이미지 라이브러리 — alt는 접근성의 핵심(AI 생성 이미지의 의미를 담는다).
 * w()로 필요한 폭을 뽑아 쓴다.
 */
const PHOTOS = {
  fog_road:   { id: "1497436072909-60f360e1d4b1", alt: "안개 낀 숲길, 흐릿하게 사라지는 나무들", mood: { calm: 3, dream: 3, nature: 2 } },
  fog_layers: { id: "1418065460487-3e41a6c84dc5", alt: "겹겹이 물러나는 안개 산등성이", mood: { calm: 3, dream: 3, nature: 2 } },
  lake:       { id: "1493246507139-91e8fad9978e", alt: "청록빛 산정 호수와 잔잔한 수면", mood: { calm: 3, nature: 3, dream: 1 } },
  reflect:    { id: "1519681393784-d120267933ba", alt: "고요한 호수에 비친 산", mood: { calm: 3, nature: 3 } },
  mist_land:  { id: "1500534623283-312aade485b7", alt: "옅은 안개가 깔린 새벽 풍경", mood: { calm: 2, dream: 3, nature: 2 } },
  forest_ray: { id: "1502082553048-f009c37129b9", alt: "숲속으로 스며드는 아침 빛줄기", mood: { calm: 2, nature: 3, dream: 2 } },
  canopy:     { id: "1441974231531-c6227db76b6e", alt: "위를 올려다본 초록 나무 지붕", mood: { nature: 3, calm: 1, vivid: 1 } },
  forest_floor:{id: "1447752875215-b2761acb3c5d", alt: "햇살이 스민 숲 바닥과 낙엽", mood: { warm: 2, nature: 3 } },
  aerial:     { id: "1501862700950-18382cd41497", alt: "위에서 내려다본 침엽수 숲", mood: { nature: 3, calm: 2 } },
  field:      { id: "1490750967868-88aa4486c946", alt: "노을빛으로 물든 들판", mood: { warm: 3, nature: 2, dream: 1 } },
  clouds:     { id: "1499591934245-40b55745b905", alt: "파스텔빛으로 번지는 노을 구름", mood: { dream: 3, calm: 1, warm: 1 } },
  stars:      { id: "1465101162946-4377e57745c3", alt: "쏟아질 듯한 밤하늘의 별", mood: { dream: 3, calm: 2 } },
  film:       { id: "1499002238440-d264edd596ec", alt: "따뜻한 필름 톤의 흐릿한 순간", mood: { warm: 3, dream: 2 } },
  bokeh:      { id: "1519741497674-611481863552", alt: "부드럽게 번지는 온기 어린 보케", mood: { warm: 3, dream: 2 } },
  cozy:       { id: "1454372182658-c712e4c5a1db", alt: "포근한 담요 위, 나른한 오후", mood: { warm: 3, calm: 2 } },
  coffee:     { id: "1524638431109-93d95c968f03", alt: "김이 오르는 커피 한 잔", mood: { warm: 3, calm: 1 } },
  flowers:    { id: "1517483000871-1dbf64a6e1c6", alt: "연한 파스텔 톤의 꽃다발", mood: { warm: 2, vivid: 2, dream: 1 } },
  neon:       { id: "1513346940221-6f673d962e97", alt: "젖은 거리에 번지는 네온 불빛", mood: { vivid: 3, dream: 2 } },
  city_night: { id: "1492684223066-81342ee5ff30", alt: "불 켜진 도시의 밤", mood: { vivid: 3, warm: 1 } },
  concert:    { id: "1470229722913-7c0e2dbbafd3", alt: "빛으로 가득 찬 공연장의 순간", mood: { vivid: 3, warm: 1 } },
  fog_morning:{ id: "1509281373149-e957c6296406", alt: "안개 자욱한 이른 아침", mood: { dream: 3, calm: 2 } },
  fog_mtn:    { id: "1470071459604-3b5ec3a7fe05", alt: "구름에 잠긴 산봉우리", mood: { dream: 2, calm: 2, nature: 2 } },
};

/*
 * 추구미 테스트 — 5문항, 세 가지 선택 타입을 모두 시연.
 *  type: "image"        이미지만 선택
 *  type: "keyword"      키워드 칩만 선택
 */
const QUESTIONS = [
  {
    id: "q1",
    type: "image",
    minSelect: 1,
    maxSelect: 3,
    title: "오래 머물고 싶은 장면은?",
    hint: "끌리는 곳을 하나에서 셋까지 골라요. 정답은 없어요.",
    options: [
      { key: "fog_road",   photo: "fog_road" },
      { key: "field",      photo: "field" },
      { key: "neon",       photo: "neon" },
      { key: "lake",       photo: "lake" },
      { key: "cozy",       photo: "cozy" },
      { key: "stars",      photo: "stars" },
    ],
  },
  {
    id: "q2",
    type: "keyword",
    minSelect: 2,
    maxSelect: 4,
    title: "지금의 나를 설명하는 단어",
    hint: "마음이 가는 단어 두세 개. 겹쳐도 괜찮아요.",
    options: [
      { key: "quiet",   label: "잔잔한",     mood: { calm: 3 } },
      { key: "warm",    label: "다정한",     mood: { warm: 3 } },
      { key: "dreamy",  label: "몽롱한",     mood: { dream: 3 } },
      { key: "fresh",   label: "청량한",     mood: { nature: 2, vivid: 1 } },
      { key: "vivid",   label: "선명한",     mood: { vivid: 3 } },
      { key: "soft",    label: "보드라운",   mood: { warm: 2, dream: 1 } },
      { key: "wild",    label: "자유로운",   mood: { nature: 2, vivid: 2 } },
      { key: "still",   label: "고요한",     mood: { calm: 3, dream: 1 } },
    ],
  },
  {
    id: "q3",
    type: "image",
    minSelect: 1,
    maxSelect: 2,
    title: "끌리는 빛과 공기",
    hint: "색이 아니라 '공기'를 고른다고 생각해봐요.",
    options: [
      { key: "clouds",     photo: "clouds" },
      { key: "forest_ray", photo: "forest_ray" },
      { key: "film",       photo: "film" },
      { key: "city_night", photo: "city_night" },
      { key: "fog_morning",photo: "fog_morning" },
      { key: "flowers",    photo: "flowers" },
    ],
  },
  {
    id: "q4",
    type: "image",
    minSelect: 1,
    maxSelect: 1,
    title: "무드보드의 주인공 한 컷",
    hint: "가장 '나 같은' 한 장을 골라요.",
    options: [
      { key: "reflect",   photo: "reflect" },
      { key: "bokeh",     photo: "bokeh" },
      { key: "aerial",    photo: "aerial" },
      { key: "concert",   photo: "concert" },
      { key: "fog_layers",photo: "fog_layers" },
      { key: "coffee",    photo: "coffee" },
    ],
  },
  {
    id: "q5",
    type: "keyword",
    minSelect: 2,
    maxSelect: 4,
    title: "보드에 담고 싶은 것",
    hint: "완성될 무드에 스며들 감각들.",
    options: [
      { key: "morning",  label: "이른 아침",   mood: { calm: 2, nature: 1 } },
      { key: "analog",   label: "필름 감성",   mood: { warm: 3, dream: 1 } },
      { key: "walk",     label: "혼자 걷기",   mood: { calm: 2, nature: 2 } },
      { key: "citypop",  label: "도시의 밤",   mood: { vivid: 3 } },
      { key: "sea",      label: "먼 바다",     mood: { calm: 2, nature: 2, dream: 1 } },
      { key: "haze",     label: "안개",        mood: { dream: 3 } },
      { key: "petal",    label: "꽃잎",        mood: { warm: 2, vivid: 1 } },
      { key: "glow",     label: "은은한 빛",   mood: { warm: 2, dream: 2 } },
    ],
  },
];

// 생성중 화면에서 로테이션되는 위트 있는 상태 메시지.
const GEN_MESSAGES = [
  "당신이 고른 공기를 모으는 중…",
  "색과 색 사이의 온도를 맞추는 중…",
  "빛이 번지는 자리를 고르는 중…",
  "조각들을 한 화면으로 포개는 중…",
  "거의 다 됐어요. 숨을 고르는 중…",
];

// 무드 성향 이름 — 우세한 두 축의 조합으로 결정.
const PROFILES = [
  { keys: ["dream", "calm"],  name: "고요한 몽상가", en: "Quiet Dreamer",
    desc: "선명함보다 여운을 좋아하는 사람. 흐릿한 것들 사이에서 자기만의 온도를 찾아요." },
  { keys: ["warm", "nature"], name: "다정한 산책자", en: "Warm Wanderer",
    desc: "빛이 좋은 날의 산책 같은 취향. 자연스럽고 따뜻한 것에 오래 머물러요." },
  { keys: ["vivid", "warm"],  name: "빛을 모으는 사람", en: "Light Collector",
    desc: "밤의 도시와 선명한 순간을 사랑하는 사람. 에너지가 색으로 새어 나와요." },
  { keys: ["calm", "nature"], name: "잔잔한 관찰자", en: "Still Observer",
    desc: "소란보다 결을 보는 사람. 조용한 풍경 안에서 가장 편안해요." },
  { keys: ["dream", "vivid"], name: "환상 수집가", en: "Reverie Keeper",
    desc: "현실과 꿈의 경계를 좋아하는 사람. 강렬하면서도 아득한 장면에 끌려요." },
  { keys: ["nature", "vivid"],name: "선명한 방랑자", en: "Vivid Roamer",
    desc: "살아있는 색과 넓은 풍경을 함께 원하는 사람. 밖에 있을 때 가장 나다워요." },
];

const FALLBACK_PROFILE = {
  name: "은은한 수집가", en: "Soft Collector",
  desc: "한쪽으로 치우치지 않고, 취향을 천천히 모아가는 사람. 균형 잡힌 감각을 가졌어요.",
};

// 편집 화면 스티커 — 이모지·클립아트 대신 취향 있는 라인 SVG 모티프.
const STICKERS = [
  { key: "spark",  label: "반짝임" },
  { key: "star",   label: "별" },
  { key: "moon",   label: "달" },
  { key: "sun",    label: "해" },
  { key: "wave",   label: "물결" },
  { key: "arch",   label: "아치" },
  { key: "heart",  label: "하트" },
  { key: "quote",  label: "따옴표" },
];

window.MOODME = { IMG, AXES, PHOTOS, QUESTIONS, GEN_MESSAGES, PROFILES, FALLBACK_PROFILE, STICKERS };
