// 추구미 테스트 3막 시드 데이터. docs/work/todo/mood-test-questions.md 확정 스펙(7/7) 그대로.
// 카드 이미지: public/test-image/aesthetic/{id}.jpg (수집 대장: docs/work/todo/mood-test-image.md)
// GET /api/mood-test/questions가 이 파일을 그대로 반환한다.

export type Card = {
  id: string;
  label: string;
  imagePath: string;
  promptTags: string[];
  personaWeights: Record<string, number>;
};

export type Shadow = {
  id: string;
  label: string;
  domain: string;
};

export type Transition = {
  id: string;
  shadowId: string;
  label: string;
  themeTag: string | null;
  isObviousAntonym: boolean;
};

export type MoodTestSeed = {
  cards: Card[];
  shadows: Shadow[];
  transitions: Transition[];
};

function cardImage(id: string) {
  return `/test-image/aesthetic/${id}.jpg`;
}

export const CARDS: Card[] = [
  {
    id: "c01",
    label: "새벽 요가 매트",
    imagePath: cardImage("c01"),
    promptTags: ["뉴트럴 톤", "아침 빛", "고요한 루틴"],
    personaWeights: { "클린 걸": 0.6, "웰니스 러너": 0.4 },
  },
  {
    id: "c02",
    label: "정돈된 화장대",
    imagePath: cardImage("c02"),
    promptTags: ["미니멀", "유리", "크림 톤"],
    personaWeights: { "클린 걸": 0.7, "올드 머니": 0.3 },
  },
  {
    id: "c03",
    label: "테니스 코트",
    imagePath: cardImage("c03"),
    promptTags: ["리넨", "잔디", "콰이어트 럭셔리"],
    personaWeights: { "올드 머니": 0.7, "클린 걸": 0.3 },
  },
  {
    id: "c04",
    label: "요트 위 리넨 셔츠",
    imagePath: cardImage("c04"),
    promptTags: ["바람", "화이트", "여유"],
    personaWeights: { "올드 머니": 0.5, 코스탈: 0.5 },
  },
  {
    id: "c05",
    label: "새틴 리본 발레슈즈",
    imagePath: cardImage("c05"),
    promptTags: ["파스텔", "새틴", "로맨스"],
    personaWeights: { 코케트: 0.8, "네오 로맨틱": 0.2 },
  },
  {
    id: "c06",
    label: "딸기 케이크와 도일리",
    imagePath: cardImage("c06"),
    promptTags: ["러블리", "파스텔", "달콤함"],
    personaWeights: { 코케트: 0.6, "코지 홈바디": 0.4 },
  },
  {
    id: "c07",
    label: "반짝이 폴더폰",
    imagePath: cardImage("c07"),
    promptTags: ["글리터", "원색", "플라스틱"],
    personaWeights: { "Y2K 키치": 0.8, "맥시멀 글램": 0.2 },
  },
  {
    id: "c08",
    label: "비즈 목걸이 무더기",
    imagePath: cardImage("c08"),
    promptTags: ["알록달록", "키치", "장난기"],
    personaWeights: { "Y2K 키치": 0.6, "맥시멀 글램": 0.4 },
  },
  {
    id: "c09",
    label: "플래시 터진 파티 스냅",
    imagePath: cardImage("c09"),
    promptTags: ["그레인", "새벽", "논 흔적"],
    personaWeights: { "인디 슬리즈": 0.8, "소프트 그런지": 0.2 },
  },
  {
    id: "c10",
    label: "지하 공연장 스티커 벽",
    imagePath: cardImage("c10"),
    promptTags: ["로우파이", "청춘", "낙서"],
    personaWeights: { "인디 슬리즈": 0.5, "소프트 그런지": 0.5 },
  },
  {
    id: "c11",
    label: "촛불 아래 고서",
    imagePath: cardImage("c11"),
    promptTags: ["앤틱", "깊은 브라운", "지적"],
    personaWeights: { "다크 아카데미아": 0.8, "네오 로맨틱": 0.2 },
  },
  {
    id: "c12",
    label: "오래된 도서관 사다리",
    imagePath: cardImage("c12"),
    promptTags: ["목재", "고전", "아카이브"],
    personaWeights: { "다크 아카데미아": 0.6, "라이트 아카데미아": 0.4 },
  },
  {
    id: "c13",
    label: "크림톤 노트와 아침 커피",
    imagePath: cardImage("c13"),
    promptTags: ["밝은 베이지", "부드러운 빛", "성실"],
    personaWeights: { "라이트 아카데미아": 0.7, "클린 걸": 0.3 },
  },
  {
    id: "c14",
    label: "오전의 스터디 카페 창가",
    imagePath: cardImage("c14"),
    promptTags: ["따뜻한 우드", "집중", "오전 빛"],
    personaWeights: { "라이트 아카데미아": 0.7, "커리어 보스": 0.3 },
  },
  {
    id: "c15",
    label: "갓 구운 빵과 밀가루 손",
    imagePath: cardImage("c15"),
    promptTags: ["크러스트", "온기", "슬로우 리빙"],
    personaWeights: { 코티지코어: 0.8, "코지 홈바디": 0.2 },
  },
  {
    id: "c16",
    label: "텃밭에서 딴 채소 바구니",
    imagePath: cardImage("c16"),
    promptTags: ["흙", "초록", "손노동"],
    personaWeights: { 코티지코어: 0.8, "웰니스 러너": 0.2 },
  },
  {
    id: "c17",
    label: "숲속 빛내림",
    imagePath: cardImage("c17"),
    promptTags: ["몽환", "안개", "초록 빛"],
    personaWeights: { 페어리코어: 0.8, 스피리추얼: 0.2 },
  },
  {
    id: "c18",
    label: "유리병 속 페어리라이트",
    imagePath: cardImage("c18"),
    promptTags: ["반짝임", "어스름", "동화"],
    personaWeights: { 페어리코어: 0.7, "네오 로맨틱": 0.3 },
  },
  {
    id: "c19",
    label: "파도 거품과 소금기",
    imagePath: cardImage("c19"),
    promptTags: ["청량", "물빛", "바람"],
    personaWeights: { 코스탈: 0.8, 트래블러: 0.2 },
  },
  {
    id: "c20",
    label: "모래 위 맨발",
    imagePath: cardImage("c20"),
    promptTags: ["자연스러움", "베이지", "느린 오후"],
    personaWeights: { 코스탈: 0.7, "클린 걸": 0.3 },
  },
  {
    id: "c21",
    label: "가죽 재킷과 체인",
    imagePath: cardImage("c21"),
    promptTags: ["블랙", "락", "마모된 질감"],
    personaWeights: { "소프트 그런지": 0.8, "인디 슬리즈": 0.2 },
  },
  {
    id: "c22",
    label: "흑백 콘서트 조명",
    imagePath: cardImage("c22"),
    promptTags: ["모노크롬", "스포트라이트", "열기"],
    personaWeights: { "소프트 그런지": 0.7, "맥시멀 글램": 0.3 },
  },
  {
    id: "c23",
    label: "다크 모노톤 데스크 셋업",
    imagePath: cardImage("c23"),
    promptTags: ["무채색", "미래적 절제", "딥 블랙"],
    personaWeights: { "테크 노어": 0.8, "커리어 보스": 0.2 },
  },
  {
    id: "c24",
    label: "금속 프레임의 네온 반사",
    imagePath: cardImage("c24"),
    promptTags: ["크롬", "네온", "도시 밤"],
    personaWeights: { "테크 노어": 0.7, "Y2K 키치": 0.3 },
  },
  {
    id: "c25",
    label: "과감한 패턴 벨벳 소파",
    imagePath: cardImage("c25"),
    promptTags: ["벨벳", "주얼 톤", "드라마틱"],
    personaWeights: { "맥시멀 글램": 0.8, "네오 로맨틱": 0.2 },
  },
  {
    id: "c26",
    label: "반짝이는 드레스룸 거울",
    imagePath: cardImage("c26"),
    promptTags: ["글램", "조명", "스타일링"],
    personaWeights: { "맥시멀 글램": 0.7, "Y2K 키치": 0.3 },
  },
  {
    id: "c27",
    label: "시어 커튼 사이 레이스",
    imagePath: cardImage("c27"),
    promptTags: ["겹침", "부드러운 빛", "로맨틱"],
    personaWeights: { "네오 로맨틱": 0.8, 페어리코어: 0.2 },
  },
  {
    id: "c28",
    label: "빛바랜 러브레터",
    imagePath: cardImage("c28"),
    promptTags: ["세피아", "손글씨", "그리움"],
    personaWeights: { "네오 로맨틱": 0.7, "다크 아카데미아": 0.3 },
  },
  {
    id: "c29",
    label: "네잎클로버 책갈피",
    imagePath: cardImage("c29"),
    promptTags: ["행운", "초록", "확언"],
    personaWeights: { 러키걸: 0.7, 스피리추얼: 0.3 },
  },
  {
    id: "c30",
    label: "공항 라운지의 노트북",
    imagePath: cardImage("c30"),
    promptTags: ["출장", "유리창 활주로", "성취"],
    personaWeights: { "커리어 보스": 0.7, 트래블러: 0.3 },
  },
  {
    id: "c31",
    label: "러닝 후 기록 화면",
    imagePath: cardImage("c31"),
    promptTags: ["땀", "새벽 러닝", "활력"],
    personaWeights: { "웰니스 러너": 0.8, "클린 걸": 0.2 },
  },
  {
    id: "c32",
    label: "기차역 플랫폼의 배낭",
    imagePath: cardImage("c32"),
    promptTags: ["떠남", "이른 아침", "자유"],
    personaWeights: { 트래블러: 0.8, 코스탈: 0.2 },
  },
  {
    id: "c33",
    label: "낡은 여권과 스탬프",
    imagePath: cardImage("c33"),
    promptTags: ["여정의 흔적", "종이 질감"],
    personaWeights: { 트래블러: 0.8, "올드 머니": 0.2 },
  },
  {
    id: "c34",
    label: "타로 카드와 달 조명",
    imagePath: cardImage("c34"),
    promptTags: ["신비", "자정", "달 주기"],
    personaWeights: { 스피리추얼: 0.8, "다크 아카데미아": 0.2 },
  },
  {
    id: "c35",
    label: "담요 속 고양이와 낮잠",
    imagePath: cardImage("c35"),
    promptTags: ["포근", "낮잠", "반려"],
    personaWeights: { "코지 홈바디": 0.8, 코티지코어: 0.2 },
  },
  {
    id: "c36",
    label: "홈카페 라떼와 창밖 비",
    imagePath: cardImage("c36"),
    promptTags: ["스팀", "빗소리", "아늑"],
    personaWeights: { "코지 홈바디": 0.7, "라이트 아카데미아": 0.3 },
  },
];

export const SHADOWS: Shadow[] = [
  { id: "s1", label: "번아웃", domain: "에너지 고갈" },
  { id: "s2", label: "비교하는 마음", domain: "SNS 비교" },
  { id: "s3", label: "미루는 버릇", domain: "실행" },
  { id: "s4", label: "눈치보기", domain: "관계" },
  { id: "s5", label: "조급함", domain: "시간·속도" },
  { id: "s6", label: "무기력", domain: "의욕" },
  { id: "s7", label: "어중간함", domain: "정체성·취향 확신" },
  { id: "s8", label: "쏟아지는 알림", domain: "과잉 연결" },
];

export const TRANSITIONS: Transition[] = [
  {
    id: "t1-1",
    shadowId: "s1",
    label: "휴식",
    themeTag: null,
    isObviousAntonym: true,
  },
  {
    id: "t1-2",
    shadowId: "s1",
    label: "몰입",
    themeTag: "커리어 보스",
    isObviousAntonym: false,
  },
  {
    id: "t1-3",
    shadowId: "s1",
    label: "활력",
    themeTag: "웰니스 러너",
    isObviousAntonym: false,
  },
  {
    id: "t1-4",
    shadowId: "s1",
    label: "훌쩍 떠나기",
    themeTag: "트래블러",
    isObviousAntonym: false,
  },

  {
    id: "t2-1",
    shadowId: "s2",
    label: "자존감",
    themeTag: null,
    isObviousAntonym: true,
  },
  {
    id: "t2-2",
    shadowId: "s2",
    label: "나만의 속도",
    themeTag: "웰니스 러너",
    isObviousAntonym: false,
  },
  {
    id: "t2-3",
    shadowId: "s2",
    label: "나의 세계",
    themeTag: "홈바디·취향",
    isObviousAntonym: false,
  },
  {
    id: "t2-4",
    shadowId: "s2",
    label: "행운의 감각",
    themeTag: "러키걸",
    isObviousAntonym: false,
  },

  {
    id: "t3-1",
    shadowId: "s3",
    label: "실행력",
    themeTag: null,
    isObviousAntonym: true,
  },
  {
    id: "t3-2",
    shadowId: "s3",
    label: "가벼운 시작",
    themeTag: "웰니스·루틴",
    isObviousAntonym: false,
  },
  {
    id: "t3-3",
    shadowId: "s3",
    label: "설레는 목표",
    themeTag: "러키걸",
    isObviousAntonym: false,
  },
  {
    id: "t3-4",
    shadowId: "s3",
    label: "짜릿한 마감",
    themeTag: "커리어 보스",
    isObviousAntonym: false,
  },

  {
    id: "t4-1",
    shadowId: "s4",
    label: "당당함",
    themeTag: null,
    isObviousAntonym: true,
  },
  {
    id: "t4-2",
    shadowId: "s4",
    label: "솔직함",
    themeTag: "표현",
    isObviousAntonym: false,
  },
  {
    id: "t4-3",
    shadowId: "s4",
    label: "나의 편",
    themeTag: "코지 홈바디",
    isObviousAntonym: false,
  },
  {
    id: "t4-4",
    shadowId: "s4",
    label: "쿨한 거리",
    themeTag: "미니멀",
    isObviousAntonym: false,
  },

  {
    id: "t5-1",
    shadowId: "s5",
    label: "여유",
    themeTag: null,
    isObviousAntonym: true,
  },
  {
    id: "t5-2",
    shadowId: "s5",
    label: "순간의 감각",
    themeTag: "지금 여기",
    isObviousAntonym: false,
  },
  {
    id: "t5-3",
    shadowId: "s5",
    label: "깊이",
    themeTag: "탐구",
    isObviousAntonym: false,
  },
  {
    id: "t5-4",
    shadowId: "s5",
    label: "흐름에 맡기기",
    themeTag: "스피리추얼",
    isObviousAntonym: false,
  },

  {
    id: "t6-1",
    shadowId: "s6",
    label: "활력",
    themeTag: null,
    isObviousAntonym: true,
  },
  {
    id: "t6-2",
    shadowId: "s6",
    label: "작은 불씨",
    themeTag: "러키걸",
    isObviousAntonym: false,
  },
  {
    id: "t6-3",
    shadowId: "s6",
    label: "낯선 공기",
    themeTag: "트래블러",
    isObviousAntonym: false,
  },
  {
    id: "t6-4",
    shadowId: "s6",
    label: "손의 재미",
    themeTag: "만들기·취향",
    isObviousAntonym: false,
  },

  {
    id: "t7-1",
    shadowId: "s7",
    label: "확실함",
    themeTag: null,
    isObviousAntonym: true,
  },
  {
    id: "t7-2",
    shadowId: "s7",
    label: "대담함",
    themeTag: "글램·표현",
    isObviousAntonym: false,
  },
  {
    id: "t7-3",
    shadowId: "s7",
    label: "나다움",
    themeTag: "취향 확신",
    isObviousAntonym: false,
  },
  {
    id: "t7-4",
    shadowId: "s7",
    label: "한 우물",
    themeTag: "커리어 보스",
    isObviousAntonym: false,
  },

  {
    id: "t8-1",
    shadowId: "s8",
    label: "고요",
    themeTag: null,
    isObviousAntonym: true,
  },
  {
    id: "t8-2",
    shadowId: "s8",
    label: "진짜 연결",
    themeTag: "관계",
    isObviousAntonym: false,
  },
  {
    id: "t8-3",
    shadowId: "s8",
    label: "완전한 몰입",
    themeTag: "커리어·집중",
    isObviousAntonym: false,
  },
  {
    id: "t8-4",
    shadowId: "s8",
    label: "자연 속 리셋",
    themeTag: "코스탈·코티지",
    isObviousAntonym: false,
  },
];

export const MOOD_TEST_SEED: MoodTestSeed = {
  cards: CARDS,
  shadows: SHADOWS,
  transitions: TRANSITIONS,
};
