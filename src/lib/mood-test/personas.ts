// 페르소나 20종 — 미학 코어 14 + 인생 테마 6 (docs/work/todo/mood-test-questions.md).
// 카드 personaWeights와 전환 themeTag가 참조하는 카테고리 이름의 원천 — 다른 곳에서
// 이 목록을 다시 만들지 말고 여기를 가져다 쓴다 (docs/convention/naming.md 용어사전 원칙).

export const AESTHETIC_CORES = [
  "클린 걸",
  "올드 머니",
  "코케트",
  "Y2K 키치",
  "인디 슬리즈",
  "다크 아카데미아",
  "라이트 아카데미아",
  "코티지코어",
  "페어리코어",
  "코스탈",
  "소프트 그런지",
  "테크 노어",
  "맥시멀 글램",
  "네오 로맨틱",
] as const;

export const LIFE_THEMES = [
  "커리어 보스",
  "웰니스 러너",
  "트래블러",
  "러키걸",
  "스피리추얼",
  "코지 홈바디",
] as const;

const AESTHETIC_CORE_SET = new Set<string>(AESTHETIC_CORES);
const LIFE_THEME_SET = new Set<string>(LIFE_THEMES);

// 전환 선택지 하나를 고르면 그 인생 테마에 더해지는 가중치. 카드 personaWeights(0.2~0.8)보다
// 낮게 잡아 카드 다수의 신호가 선택지 하나로 뒤집히지 않게 한다 (mood-test-questions.md 부록).
export const TRANSITION_THEME_WEIGHT = 0.5;

export function isAestheticCore(name: string): boolean {
  return AESTHETIC_CORE_SET.has(name);
}

export function isLifeTheme(name: string): boolean {
  return LIFE_THEME_SET.has(name);
}

export function topScores(
  scores: Record<string, number>,
  count: number,
): Record<string, number> {
  return Object.fromEntries(
    Object.entries(scores)
      .sort((a, b) => b[1] - a[1])
      .slice(0, count),
  );
}
