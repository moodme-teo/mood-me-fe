// 추구미 테스트 레이아웃 골격(#46)용 mock 데이터.
// docs/work/todo/mood-test-questions.md 확정 스펙(7/7)의 실제 카피를 그대로 옮겼다 —
// 이미지·프롬프트 태그·페르소나 가중치 등 시드에 필요한 나머지 필드는 #34에서 채운다.
// #34가 진짜 시드(GET /api/mood-test/questions)를 만들면 이 파일은 그걸로 교체된다.

export type MockCard = {
  id: string;
  label: string;
};

export type MockShadow = {
  id: string;
  label: string;
};

export type MockTransition = {
  id: string;
  shadowId: string;
  label: string;
  isObviousAntonym: boolean;
};

export const MOCK_CARDS: MockCard[] = [
  { id: "c01", label: "새벽 요가 매트" },
  { id: "c02", label: "정돈된 화장대" },
  { id: "c03", label: "테니스 코트" },
  { id: "c04", label: "요트 위 리넨 셔츠" },
  { id: "c05", label: "새틴 리본 발레슈즈" },
  { id: "c06", label: "딸기 케이크와 도일리" },
  { id: "c07", label: "반짝이 폴더폰" },
  { id: "c08", label: "비즈 목걸이 무더기" },
  { id: "c09", label: "플래시 터진 파티 스냅" },
  { id: "c10", label: "지하 공연장 스티커 벽" },
  { id: "c11", label: "촛불 아래 고서" },
  { id: "c12", label: "오래된 도서관 사다리" },
  { id: "c13", label: "크림톤 노트와 아침 커피" },
  { id: "c14", label: "오전의 스터디 카페 창가" },
  { id: "c15", label: "갓 구운 빵과 밀가루 손" },
  { id: "c16", label: "텃밭에서 딴 채소 바구니" },
  { id: "c17", label: "숲속 빛내림" },
  { id: "c18", label: "유리병 속 페어리라이트" },
  { id: "c19", label: "파도 거품과 소금기" },
  { id: "c20", label: "모래 위 맨발" },
  { id: "c21", label: "가죽 재킷과 체인" },
  { id: "c22", label: "흑백 콘서트 조명" },
  { id: "c23", label: "다크 모노톤 데스크 셋업" },
  { id: "c24", label: "금속 프레임의 네온 반사" },
  { id: "c25", label: "과감한 패턴 벨벳 소파" },
  { id: "c26", label: "반짝이는 드레스룸 거울" },
  { id: "c27", label: "시어 커튼 사이 레이스" },
  { id: "c28", label: "빛바랜 러브레터" },
  { id: "c29", label: "네잎클로버 책갈피" },
  { id: "c30", label: "공항 라운지의 노트북" },
  { id: "c31", label: "러닝 후 기록 화면" },
  { id: "c32", label: "기차역 플랫폼의 배낭" },
  { id: "c33", label: "낡은 여권과 스탬프" },
  { id: "c34", label: "타로 카드와 달 조명" },
  { id: "c35", label: "담요 속 고양이와 낮잠" },
  { id: "c36", label: "홈카페 라떼와 창밖 비" },
];

export const MOCK_SHADOWS: MockShadow[] = [
  { id: "s1", label: "번아웃" },
  { id: "s2", label: "비교하는 마음" },
  { id: "s3", label: "미루는 버릇" },
  { id: "s4", label: "눈치보기" },
  { id: "s5", label: "조급함" },
  { id: "s6", label: "무기력" },
  { id: "s7", label: "어중간함" },
  { id: "s8", label: "쏟아지는 알림" },
];

export const MOCK_TRANSITIONS: MockTransition[] = [
  { id: "t1-1", shadowId: "s1", label: "휴식", isObviousAntonym: true },
  { id: "t1-2", shadowId: "s1", label: "몰입 (커리어 보스)", isObviousAntonym: false },
  { id: "t1-3", shadowId: "s1", label: "활력 (웰니스 러너)", isObviousAntonym: false },
  { id: "t1-4", shadowId: "s1", label: "훌쩍 떠나기 (트래블러)", isObviousAntonym: false },

  { id: "t2-1", shadowId: "s2", label: "자존감", isObviousAntonym: true },
  { id: "t2-2", shadowId: "s2", label: "나만의 속도 (웰니스 러너)", isObviousAntonym: false },
  { id: "t2-3", shadowId: "s2", label: "나의 세계 (홈바디·취향)", isObviousAntonym: false },
  { id: "t2-4", shadowId: "s2", label: "행운의 감각 (러키걸)", isObviousAntonym: false },

  { id: "t3-1", shadowId: "s3", label: "실행력", isObviousAntonym: true },
  { id: "t3-2", shadowId: "s3", label: "가벼운 시작 (웰니스·루틴)", isObviousAntonym: false },
  { id: "t3-3", shadowId: "s3", label: "설레는 목표 (러키걸)", isObviousAntonym: false },
  { id: "t3-4", shadowId: "s3", label: "짜릿한 마감 (커리어 보스)", isObviousAntonym: false },

  { id: "t4-1", shadowId: "s4", label: "당당함", isObviousAntonym: true },
  { id: "t4-2", shadowId: "s4", label: "솔직함 (표현)", isObviousAntonym: false },
  { id: "t4-3", shadowId: "s4", label: "나의 편 (코지 홈바디)", isObviousAntonym: false },
  { id: "t4-4", shadowId: "s4", label: "쿨한 거리 (미니멀)", isObviousAntonym: false },

  { id: "t5-1", shadowId: "s5", label: "여유", isObviousAntonym: true },
  { id: "t5-2", shadowId: "s5", label: "순간의 감각 (지금 여기)", isObviousAntonym: false },
  { id: "t5-3", shadowId: "s5", label: "깊이 (탐구)", isObviousAntonym: false },
  { id: "t5-4", shadowId: "s5", label: "흐름에 맡기기 (스피리추얼)", isObviousAntonym: false },

  { id: "t6-1", shadowId: "s6", label: "활력", isObviousAntonym: true },
  { id: "t6-2", shadowId: "s6", label: "작은 불씨 (러키걸)", isObviousAntonym: false },
  { id: "t6-3", shadowId: "s6", label: "낯선 공기 (트래블러)", isObviousAntonym: false },
  { id: "t6-4", shadowId: "s6", label: "손의 재미 (만들기·취향)", isObviousAntonym: false },

  { id: "t7-1", shadowId: "s7", label: "확실함", isObviousAntonym: true },
  { id: "t7-2", shadowId: "s7", label: "대담함 (글램·표현)", isObviousAntonym: false },
  { id: "t7-3", shadowId: "s7", label: "나다움 (취향 확신)", isObviousAntonym: false },
  { id: "t7-4", shadowId: "s7", label: "한 우물 (커리어 보스)", isObviousAntonym: false },

  { id: "t8-1", shadowId: "s8", label: "고요", isObviousAntonym: true },
  { id: "t8-2", shadowId: "s8", label: "진짜 연결 (관계)", isObviousAntonym: false },
  { id: "t8-3", shadowId: "s8", label: "완전한 몰입 (커리어·집중)", isObviousAntonym: false },
  { id: "t8-4", shadowId: "s8", label: "자연 속 리셋 (코스탈·코티지)", isObviousAntonym: false },
];
